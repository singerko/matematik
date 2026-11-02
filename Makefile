.PHONY: install add dev build release cap-sync cap-assets version android-version \
	rebuild-apk sign install-apk deploy build-aab aab sign-aab release-aab rebuild-aab

AAB_PATH := android/app/build/outputs/bundle/release/app-release.aab
SIGNED_AAB_PATH := Matematik.sign.aab

# Run npm install in a container
install:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm install

# Run npm install <package> in a container
# Usage: make add PKG="package-name"
add:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm install $(PKG)

# Run dev server in a container
dev:
	podman run --rm -it -v "$$(pwd):/app" -w "/app" -p 5173:5173 node:20 npm run dev -- --host

# Build web assets in a container
build:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm run build

# Build uploadable static website package
release: build
	rm -f matematik.zip
	cd dist && zip -qr ../matematik.zip .
	@echo "Release complete! Upload ./matematik.zip to your web host."

# Sync Capacitor
cap-sync:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:22 npx cap sync

# Generate Android icons and splash screens from assets/
cap-assets:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:22 npx @capacitor/assets generate --android

# Bump version (patch)
version:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm version patch --no-git-tag-version

# Increase Android versionCode and align versionName with package.json.
android-version:
	python3 -c "import json,re; from pathlib import Path; package=json.loads(Path('package.json').read_text()); version=package['version']; path=Path('android/app/build.gradle'); text=path.read_text(); code=re.search(r'versionCode\\s+(\\d+)', text); code or exit('versionCode not found'); next_code=int(code.group(1)) + 1; text=re.sub(r'versionCode\\s+\\d+', f'versionCode {next_code}', text); text=re.sub(r'versionName\\s+\"[^\"]+\"', f'versionName \"{version}\"', text); path.write_text(text); print(f'Android versionCode -> {next_code}, versionName -> {version}')"

# Full rebuild: Web Build -> Cap Sync -> Gradle Assemble -> Copy APK
rebuild-apk: version build
	make cap-sync
	podman run --rm -v "$$(pwd):/project" -w "/project/android" docker.io/mingc/android-build-box bash -c "./gradlew assembleDebug"
	cp android/app/build/outputs/apk/debug/app-debug.apk ./Matematik.apk
	@echo "Build complete! APK is at ./Matematik.apk"

sign:
	../android.sign.sh Matematik.apk Matematik.sign.apk

install-apk:
	adb install -r Matematik.sign.apk

deploy: rebuild-apk sign install-apk

# Build an unsigned Android App Bundle for Google Play.
build-aab:
	podman run --rm -v "$$(pwd):/project" -w "/project/android" docker.io/mingc/android-build-box bash -c "./gradlew bundleRelease"
	test -f "$(AAB_PATH)"
	@echo "AAB build complete: $(AAB_PATH)"

# Build web assets, sync Capacitor, then generate an AAB without bumping versions.
aab: build cap-sync build-aab

# Sign the AAB with the shared upload key. The protected pass file is used non-interactively.
sign-aab:
	test -f "$(AAB_PATH)" || (echo "Run 'make aab' first"; exit 1)
	./sign-aab.sh "$(AAB_PATH)" "$(SIGNED_AAB_PATH)"
	@echo "Signed AAB: $(SIGNED_AAB_PATH)"

release-aab: aab sign-aab

# Full release rebuild: bump versions, rebuild web/Android assets, generate and sign AAB.
rebuild-aab: version android-version build cap-sync build-aab sign-aab
	@echo "Release rebuild complete: $(SIGNED_AAB_PATH)"
