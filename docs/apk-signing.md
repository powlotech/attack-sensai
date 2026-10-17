# Signing the Android APK

The release APK is signed with a keystore that lives **outside the repo**. Never commit it.
If you lose the `.jks` file or its passwords, an installed app can no longer be updated: you would have to uninstall it and install a new build.

## One-time setup (on your laptop)

```bash
keytool -genkeypair -v -keystore ~/attack-learner-release.jks -alias attacklearner -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 ~/attack-learner-release.jks > /tmp/ks.b64
gh secret set ANDROID_KEYSTORE_B64 < /tmp/ks.b64 && rm /tmp/ks.b64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body attacklearner
gh secret set ANDROID_KEY_PASSWORD
```

`keytool` asks for the keystore password and key password. `gh secret set` without `--body` prompts for the value, so the passwords never appear in your shell history.

**Back up** `~/attack-learner-release.jks` and both passwords somewhere offline (password manager plus a USB stick).

## Building a release

- Tag: `git tag v0.1.0 && git push --tags`. The `build-apk` workflow publishes a GitHub Release with `app-release.apk`.
- Or run the `build-apk` workflow by hand; the APK is then an artifact of that run.

`versionCode` is the workflow run number, so every build installs over the previous one.

## Installing

Download `app-release.apk` on the phone, allow installs from that source when prompted, and open it.
