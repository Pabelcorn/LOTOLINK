# Mobile Build Workflow Troubleshooting Guide

This document provides solutions to common issues encountered in the mobile-build.yml GitHub Actions workflow.

## Common Issues and Solutions

### 1. TypeScript Version Mismatch

**Symptom:**
```
WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.
SUPPORTED TYPESCRIPT VERSIONS: >=4.3.5 <5.4.0
YOUR TYPESCRIPT VERSION: 5.9.3
```

**Cause:**
The `^` semver range in package.json allows npm to install newer versions that may be incompatible.

**Solution:**
- ✅ **FIXED**: Changed `typescript: "^5.3.3"` to `typescript: "~5.3.3"` in package.json
- The `~` restricts updates to patch versions only (5.3.x), ensuring compatibility with @typescript-eslint

**Prevention:**
- Use `~` for dependencies that need strict version control
- Use `^` only when you want to allow minor version updates

---

### 2. npm ci Failures

**Symptom:**
```
npm ERR! code EUSAGE
npm ERR! The `npm ci` command can only install with an existing package-lock.json
```

**Cause:**
- Missing or corrupted package-lock.json
- Version mismatch between package.json and package-lock.json

**Solution:**
- Ensure package-lock.json is committed to the repository
- Run `npm install` locally to regenerate package-lock.json if corrupted
- Commit the updated package-lock.json

**Prevention:**
- ✅ **IMPLEMENTED**: Added validation step after npm ci to verify node_modules exists
- Always commit package-lock.json
- Use `npm ci` in CI/CD (never `npm install`)

---

### 3. Capacitor Sync Failures

**Symptom:**
```
[error] capacitor.config.ts not found
```

**Cause:**
- Missing capacitor.config.ts file
- Working directory mismatch
- Build output (dist/) not created before sync

**Solution:**
- Verify capacitor.config.ts exists in mobile-app/
- Ensure `npm run build` completes successfully before Capacitor sync
- Check that webDir in capacitor.config.ts matches actual build output directory

**Prevention:**
- ✅ **IMPLEMENTED**: Added verification steps for Capacitor configuration
- ✅ **IMPLEMENTED**: Added build output validation before Capacitor sync

---

### 4. Android Build Failures

**Symptom:**
```
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:processDebugResources'.
```

**Common Causes:**
- Missing Android SDK
- Gradle version incompatibility
- Invalid build configuration
- Stale build cache

**Solutions:**
1. **Gradle Wrapper Issues:**
   ```bash
   cd mobile-app/android
   chmod +x gradlew
   ./gradlew clean
   ```

2. **Build Cache Issues:**
   - ✅ **IMPLEMENTED**: Added automatic clean step before build
   - Use `./gradlew clean` to remove stale artifacts

3. **SDK Version Mismatch:**
   - Check android/app/build.gradle for correct compileSdk and targetSdk
   - Ensure Java 17 is being used (configured in workflow)

**Prevention:**
- ✅ **IMPLEMENTED**: Added gradlew validation
- ✅ **IMPLEMENTED**: Added stacktrace output for better debugging
- ✅ **IMPLEMENTED**: Added timeout limits to prevent hanging builds

---

### 5. iOS Build Failures

**Symptom:**
```
error: The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 13.0
```

**Cause:**
- Podfile deployment target conflicts with pod requirements
- Some Firebase pods require iOS 14.0+

**Solution:**
- ✅ **FIXED**: Workflow automatically sets deployment target to 14.0
- The workflow now uses `perl` for cross-platform Podfile editing

**Prevention:**
- Always set minimum iOS version to 14.0 in:
  - capacitor.config.ts: `ios.minVersion: '14.0'`
  - Podfile: `platform :ios, '14.0'`

---

### 6. Pod Install Failures

**Symptom:**
```
[!] CocoaPods could not find compatible versions for pod "Firebase/Messaging"
```

**Causes:**
- Version conflicts between pods
- Outdated Podfile.lock
- Network issues downloading pods

**Solutions:**
1. **Update Pods:**
   ```bash
   cd mobile-app/ios/App
   pod repo update
   pod install
   ```

2. **Clear Pod Cache:**
   ```bash
   pod cache clean --all
   rm Podfile.lock
   pod install
   ```

**Prevention:**
- ✅ **IMPLEMENTED**: CocoaPods caching in workflow
- Commit Podfile.lock for reproducible builds
- Regularly update pods: `pod update`

---

### 7. Workflow Timeouts

**Symptom:**
```
The job running on runner ... has exceeded the maximum execution time of 360 minutes.
```

**Cause:**
- Build steps hanging indefinitely
- Network issues
- Infinite loops in build scripts

**Solution:**
- ✅ **FIXED**: Added timeout-minutes to all jobs:
  - quality-checks: 20 minutes
  - build-android: 45 minutes
  - build-ios: 45 minutes
  - create-mobile-release-summary: 10 minutes

**Prevention:**
- Always set reasonable timeout limits
- Use `timeout` command for long-running shell commands
- Monitor build times and adjust timeouts as needed

---

### 8. Artifact Upload Failures

**Symptom:**
```
Error: Artifact path is not valid: /path/to/file does not exist
```

**Cause:**
- Build artifact not created
- Incorrect path in upload action
- Build failed but didn't exit with error

**Solution:**
- Verify artifact exists before upload
- Use `if-no-files-found: warn` for optional artifacts
- Use `if-no-files-found: error` for required artifacts

**Prevention:**
- ✅ **IMPLEMENTED**: Added artifact verification steps
- ✅ **IMPLEMENTED**: Proper use of if-no-files-found parameter
- Check build logs to ensure artifacts are created

---

### 9. Security Audit Failures

**Symptom:**
```
found X vulnerabilities (Y moderate, Z high, W critical)
```

**Understanding Audit Levels:**
- `npm audit` - Shows all vulnerabilities
- `npm audit --audit-level=high` - Fails only on HIGH/CRITICAL
- `npm audit --audit-level=moderate` - Fails on MODERATE/HIGH/CRITICAL

**Current Configuration:**
- ✅ Workflow uses `--audit-level=high`
- MODERATE vulnerabilities in dev dependencies are acceptable
- Production dependencies should have no HIGH/CRITICAL issues

**Solutions:**
1. **For High/Critical Vulnerabilities:**
   ```bash
   npm audit fix
   npm audit fix --force  # if needed (may cause breaking changes)
   ```

2. **For Dev Dependencies:**
   - MODERATE vulnerabilities are acceptable if in dev dependencies only
   - Review and upgrade when feasible

**Prevention:**
- Regular dependency updates
- Use `npm outdated` to check for updates
- Monitor GitHub security advisories

---

### 10. Cache Corruption

**Symptom:**
- Inconsistent build results
- "Module not found" errors
- Strange compilation errors

**Causes:**
- Stale npm cache
- Corrupted Gradle cache
- Outdated CocoaPods cache

**Solutions:**
1. **Clear npm Cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm ci --legacy-peer-deps
   ```

2. **Clear Gradle Cache:**
   ```bash
   cd mobile-app/android
   ./gradlew clean cleanBuildCache
   rm -rf .gradle
   ```

3. **Clear CocoaPods Cache:**
   ```bash
   pod cache clean --all
   rm -rf ~/Library/Caches/CocoaPods
   ```

**Prevention:**
- ✅ **IMPLEMENTED**: Gradle cache with cleanup
- ✅ **IMPLEMENTED**: CocoaPods caching
- ✅ **IMPLEMENTED**: npm caching with proper cache keys
- Use cache-read-only for PR builds

---

## Workflow Configuration Best Practices

### 1. Job Timeouts
Always set timeout-minutes to prevent runaway jobs:
```yaml
jobs:
  my-job:
    timeout-minutes: 30
```

### 2. Concurrency Control
Prevent concurrent builds of the same ref:
```yaml
concurrency:
  group: mobile-build-${{ github.ref }}
  cancel-in-progress: true
```

### 3. Error Handling
Use appropriate error handling:
- `continue-on-error: true` - For optional steps (tests, optional artifacts)
- Exit with error code 1 for critical failures
- Provide clear error messages

### 4. Caching Strategy
- Cache npm dependencies with package-lock.json hash
- Use cache-read-only for PR builds
- Enable cache cleanup

### 5. Validation Steps
Always validate prerequisites:
- ✅ Check node_modules exists after npm ci
- ✅ Check dist/ exists after build
- ✅ Check Capacitor config exists before sync
- ✅ Check platform directories after sync

---

## Debugging Workflow Issues

### 1. Enable Debug Logging
Add to workflow:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### 2. Add Diagnostic Steps
```yaml
- name: Debug - Show environment
  run: |
    node --version
    npm --version
    echo "Working directory: $(pwd)"
    echo "Directory contents:"
    ls -la
```

### 3. Use Step Summaries
```yaml
- name: Build Summary
  run: |
    echo "## Build Results" >> $GITHUB_STEP_SUMMARY
    echo "- Status: Success ✅" >> $GITHUB_STEP_SUMMARY
```

### 4. Upload Logs on Failure
```yaml
- name: Upload build logs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: build-logs
    path: |
      mobile-app/android/build.log
      mobile-app/ios/App/build.log
```

---

## Quick Reference: Common Commands

### Local Development
```bash
# Install dependencies
cd mobile-app
npm ci --legacy-peer-deps

# Run linter
npm run lint

# Run TypeScript check
npx tsc --noEmit

# Run tests
npm test

# Build web assets
npm run build

# Sync Capacitor
npx cap sync

# Android build
cd android
./gradlew assembleDebug

# iOS build (macOS only)
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug
```

### Troubleshooting Commands
```bash
# Check versions
node --version
npm --version
npx tsc --version

# Clean everything
rm -rf node_modules package-lock.json
npm cache clean --force
npm ci --legacy-peer-deps

# Android clean
cd mobile-app/android
./gradlew clean cleanBuildCache

# iOS clean
cd mobile-app/ios/App
pod cache clean --all
rm -rf Pods Podfile.lock
pod install
```

---

## Getting Help

If you encounter an issue not covered here:

1. Check the workflow run logs in GitHub Actions
2. Look for error messages in step outputs
3. Review the relevant section in this troubleshooting guide
4. Check mobile-app/BUILD_GUIDE.md for platform-specific issues
5. Create an issue with:
   - Workflow run ID
   - Full error message
   - Steps to reproduce

---

**Last Updated:** December 2024
**Workflow Version:** mobile-build.yml v2
