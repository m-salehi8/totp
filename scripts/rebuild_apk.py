#!/usr/bin/env python3
"""
Rebuild and re-sign Android APK with the latest Vite web distribution assets.
Supports both APK Signature Scheme v1 (JAR signing) and v2 (APK Signing Block).
"""

import os
import sys
import glob
import struct
import base64
import hashlib
import zipfile
import subprocess
from io import BytesIO

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(BASE_DIR, "dist")
PUBLIC_APK = os.path.join(BASE_DIR, "public", "totp-authenticator.apk")
DIST_APK = os.path.join(BASE_DIR, "dist", "totp-authenticator.apk")
KEY_PEM = "/tmp/apk_key.pem"
CERT_PEM = "/tmp/apk_cert.pem"
CERT_DER = "/tmp/apk_cert.der"
PUBKEY_DER = "/tmp/apk_pubkey.der"

def ensure_crypto_keys():
    if not (os.path.exists(KEY_PEM) and os.path.exists(CERT_PEM) and os.path.exists(CERT_DER) and os.path.exists(PUBKEY_DER)):
        print("[1/5] Generating RSA 2048-bit debug signing certificate...")
        cmd1 = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
            "-keyout", KEY_PEM, "-out", CERT_PEM, "-days", "10000",
            "-subj", "/CN=Kelidban Authenticator/O=Kelidban/C=IR"
        ]
        subprocess.check_call(cmd1)
        cmd2 = ["openssl", "x509", "-in", CERT_PEM, "-outform", "DER", "-out", CERT_DER]
        subprocess.check_call(cmd2)
        cmd3 = ["openssl", "rsa", "-in", KEY_PEM, "-pubout", "-outform", "DER", "-out", PUBKEY_DER]
        subprocess.check_call(cmd3)

def read_template_apk(apk_path):
    print(f"[2/5] Reading base APK binaries from {apk_path}...")
    preserved_files = {}
    with zipfile.ZipFile(apk_path, "r") as z:
        for name in z.namelist():
            # Keep DEX, AndroidManifest, resources, and drawables/icons
            if name.startswith("META-INF/") or name.startswith("assets/"):
                continue
            preserved_files[name] = z.read(name)
    return preserved_files

def collect_dist_assets():
    print(f"[3/5] Collecting latest web assets from {DIST_DIR}...")
    assets = {}
    for root, _, files in os.walk(DIST_DIR):
        for f in files:
            if f.endswith(".apk") or f.endswith(".idsig"):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, DIST_DIR).replace("\\", "/")
            asset_apk_path = f"assets/{rel_path}"
            with open(full_path, "rb") as fp:
                assets[asset_apk_path] = fp.read()
    return assets

def build_v1_signed_zip(all_files):
    # Sort file names deterministically
    sorted_names = sorted(all_files.keys())

    # Build MANIFEST.MF
    manifest_lines = [
        "Manifest-Version: 1.0",
        "Built-By: KelidbanBuild",
        "Created-By: 1.0 (Android)",
        ""
    ]
    manifest_entry_digests = {}
    for name in sorted_names:
        content = all_files[name]
        d = hashlib.sha256(content).digest()
        b64 = base64.b64encode(d).decode("ascii")
        entry_lines = [
            f"Name: {name}",
            f"SHA-256-Digest: {b64}",
            ""
        ]
        entry_text = "\r\n".join(entry_lines)
        manifest_lines.extend([f"Name: {name}", f"SHA-256-Digest: {b64}", ""])
        manifest_entry_digests[name] = base64.b64encode(hashlib.sha256(entry_text.encode("utf-8")).digest()).decode("ascii")

    manifest_bytes = "\r\n".join(manifest_lines).encode("utf-8")
    manifest_digest = base64.b64encode(hashlib.sha256(manifest_bytes).digest()).decode("ascii")

    # Build CERT.SF
    sf_lines = [
        "Signature-Version: 1.0",
        "Created-By: 1.0 (Android)",
        f"SHA-256-Digest-Manifest: {manifest_digest}",
        "X-Android-APK-Signed: 2",
        ""
    ]
    for name in sorted_names:
        sf_lines.extend([
            f"Name: {name}",
            f"SHA-256-Digest: {manifest_entry_digests[name]}",
            ""
        ])
    sf_bytes = "\r\n".join(sf_lines).encode("utf-8")

    # Sign CERT.SF with OpenSSL to produce CERT.RSA (PKCS#7 DER)
    sf_tmp = "/tmp/cert.sf"
    rsa_tmp = "/tmp/cert.rsa"
    with open(sf_tmp, "wb") as f:
        f.write(sf_bytes)
    cmd = [
        "openssl", "smime", "-sign", "-in", sf_tmp, "-out", rsa_tmp,
        "-outform", "DER", "-inkey", KEY_PEM, "-signer", CERT_PEM, "-nosmimecap"
    ]
    subprocess.check_call(cmd)
    with open(rsa_tmp, "rb") as f:
        rsa_bytes = f.read()

    # Now assemble the ZIP in memory
    bio = BytesIO()
    with zipfile.ZipFile(bio, "w", compression=zipfile.ZIP_DEFLATED) as z:
        # Write files
        for name in sorted_names:
            # Android asset alignment: keep uncompressed if already compressed or media/dex
            compress = zipfile.ZIP_DEFLATED
            z.writestr(name, all_files[name], compress_type=compress)
        # Write META-INF files
        z.writestr("META-INF/MANIFEST.MF", manifest_bytes, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("META-INF/CERT.SF", sf_bytes, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("META-INF/CERT.RSA", rsa_bytes, compress_type=zipfile.ZIP_DEFLATED)

    return bio.getvalue()

def sign_v2(zip_bytes):
    print("[4/5] Applying APK Signature Scheme v2 (Chunked SHA-256 + RSA-PKCS1-v1_5)...")
    data = zip_bytes
    eocd_idx = data.rfind(b"PK\x05\x06")
    if eocd_idx < 0:
        raise ValueError("Invalid ZIP file, EOCD not found")

    cd_size, cd_offset = struct.unpack_from("<II", data, eocd_idx + 12)
    sec1 = data[:cd_offset]
    sec3 = data[cd_offset:eocd_idx]

    # sec4 is EOCD with Central Directory offset set to cd_offset (which will be the offset of the APK Signing Block)
    sec4 = bytearray(data[eocd_idx:])
    # We will adjust offset later when we know the exact size of the APK Signing Block

    # 1. Calculate 1MB chunk digests
    chunk_digests = []
    # Note: for chunk digest calculation of section 4, the EOCD cd_offset is temporarily set to cd_offset
    # (i.e. the start offset of the APK Signing Block, which is sec1's length)
    sec4_for_hashing = bytearray(sec4)
    struct.pack_into("<I", sec4_for_hashing, 16, len(sec1))

    for sec in [sec1, sec3, bytes(sec4_for_hashing)]:
        for i in range(0, len(sec), 1048576):
            chunk = sec[i : i + 1048576]
            h = hashlib.sha256()
            h.update(b"\xa5" + struct.pack("<I", len(chunk)) + chunk)
            chunk_digests.append(h.digest())

    top_h = hashlib.sha256()
    top_h.update(b"\x5a" + struct.pack("<I", len(chunk_digests)) + b"".join(chunk_digests))
    top_level_digest = top_h.digest()

    # Read Cert and Public Key DER
    with open(CERT_DER, "rb") as cf:
        cert_der = cf.read()
    with open(PUBKEY_DER, "rb") as pf:
        pubkey_der = pf.read()

    # 2. Build signed_data
    # digests sequence
    # 0x0103 = SIGNATURE_RSA_PKCS1_V1_5_WITH_SHA256
    digest_entry = struct.pack("<II", 0x0103, len(top_level_digest)) + top_level_digest
    digest_entry_with_len = struct.pack("<I", len(digest_entry)) + digest_entry
    digests_seq = struct.pack("<I", len(digest_entry_with_len)) + digest_entry_with_len

    # certs sequence
    cert_entry_with_len = struct.pack("<I", len(cert_der)) + cert_der
    certs_seq = struct.pack("<I", len(cert_entry_with_len)) + cert_entry_with_len

    # additional attributes: empty
    attrs_seq = struct.pack("<I", 0)

    signed_data = digests_seq + certs_seq + attrs_seq
    signed_data_with_len = struct.pack("<I", len(signed_data)) + signed_data

    # 3. Sign signed_data with RSA-SHA256 (PKCS#1 v1.5)
    tmp_sd = "/tmp/v2_signed_data.bin"
    tmp_sig = "/tmp/v2_signature.bin"
    with open(tmp_sd, "wb") as f:
        f.write(signed_data)
    cmd = ["openssl", "dgst", "-sha256", "-sign", KEY_PEM, "-out", tmp_sig, tmp_sd]
    subprocess.check_call(cmd)
    with open(tmp_sig, "rb") as f:
        sig_bytes = f.read()

    # signatures sequence
    sig_entry = struct.pack("<II", 0x0103, len(sig_bytes)) + sig_bytes
    sig_entry_with_len = struct.pack("<I", len(sig_entry)) + sig_entry
    signatures_seq = struct.pack("<I", len(sig_entry_with_len)) + sig_entry_with_len

    # public key with len
    pubkey_with_len = struct.pack("<I", len(pubkey_der)) + pubkey_der

    # complete signer
    signer = signed_data_with_len + signatures_seq + pubkey_with_len
    signer_with_len = struct.pack("<I", len(signer)) + signer
    signers_seq = struct.pack("<I", len(signer_with_len)) + signer_with_len

    # v2 ID-value pair: ID = 0x7109871a
    pair_id = 0x7109871a
    pair_val = signers_seq
    pair_len = 4 + len(pair_val)
    pair = struct.pack("<QI", pair_len, pair_id) + pair_val

    # Construct APK Signing Block
    # Total block size excluding the 8-byte initial size header
    block_size = len(pair) + 24
    header = struct.pack("<Q", block_size)
    footer = struct.pack("<Q", block_size) + b"APK Sig Block 42"
    apk_signing_block = header + pair + footer

    # Update EOCD Central Directory offset
    new_cd_offset = len(sec1) + len(apk_signing_block)
    struct.pack_into("<I", sec4, 16, new_cd_offset)

    # Final APK: Section 1 + APK Signing Block + Section 3 + Section 4
    final_apk = sec1 + apk_signing_block + sec3 + bytes(sec4)
    return final_apk

def main():
    ensure_crypto_keys()
    preserved_files = read_template_apk(PUBLIC_APK)
    dist_assets = collect_dist_assets()

    all_files = {}
    all_files.update(preserved_files)
    all_files.update(dist_assets)

    print(f"Total entries in new APK: {len(all_files)} ({len(dist_assets)} web assets)")

    v1_zip = build_v1_signed_zip(all_files)
    v2_apk = sign_v2(v1_zip)

    # Save to public and dist
    print(f"[5/5] Writing updated APK ({len(v2_apk)} bytes) to:")
    print(f"  -> {PUBLIC_APK}")
    with open(PUBLIC_APK, "wb") as f:
        f.write(v2_apk)

    print(f"  -> {DIST_APK}")
    with open(DIST_APK, "wb") as f:
        f.write(v2_apk)

    # Also update android/app/src/main/assets if directory exists
    android_assets_dir = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets")
    if os.path.isdir(android_assets_dir):
        dest = os.path.join(android_assets_dir, "totp-authenticator.apk")
        with open(dest, "wb") as f:
            f.write(v2_apk)

    print("SUCCESS: APK successfully rebuilt, re-packaged, and signed with v1 + v2!")

if __name__ == "__main__":
    main()
