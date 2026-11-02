#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") <input.aab> [output.aab] [alias]" >&2
  exit 2
}

[[ $# -ge 1 ]] || usage

input="$1"
output="${2:-${input%.aab}-signed.aab}"
alias_name="${3:-master}"
keystore="$HOME/.android.apps/keys/android-release.p12"
passfile="$HOME/.android.apps/pass.txt"

[[ -f "$input" ]] || { echo "ERROR: Input AAB not found: $input" >&2; exit 2; }
[[ -f "$keystore" ]] || { echo "ERROR: Keystore not found: $keystore" >&2; exit 2; }
[[ -f "$passfile" ]] || { echo "ERROR: Password file not found: $passfile" >&2; exit 2; }
command -v jarsigner >/dev/null 2>&1 || { echo "ERROR: jarsigner not found" >&2; exit 2; }

password="$(tr -d '\r\n' < "$passfile")"
[[ -n "$password" ]] || { echo "ERROR: Password file is empty" >&2; exit 2; }

temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"; unset password' EXIT
signed="$temp_dir/signed.aab"
cp "$input" "$signed"

jarsigner \
  -sigalg SHA256withRSA \
  -digestalg SHA-256 \
  -keystore "$keystore" \
  -storetype PKCS12 \
  -storepass "$password" \
  -keypass "$password" \
  "$signed" \
  "$alias_name" >/dev/null

jarsigner -verify "$signed" >/dev/null
cp -f "$signed" "$output"
echo "$output"
