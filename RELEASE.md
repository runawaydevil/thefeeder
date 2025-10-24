# Release Guide - v0.0.1

## Pre-Release Checklist

- [x] All features implemented and tested
- [x] Docker build tested successfully
- [x] No linter errors
- [x] Documentation updated
- [x] GitHub Actions configured
- [x] README with both repositories

## Release Steps

### 1. Commit all changes
```bash
git add .
git commit -m "feat: v0.0.1 - Complete UX improvements and release preparation"
```

### 2. Add remotes (if not already configured)
```bash
# Check existing remotes
git remote -v

# Add GitHub remote
git remote add origin https://github.com/runawaydevil/thefeeder.git

# Add Forgejo remote
git remote add forgejo https://git.teu.cool/pablo/thefeeder.git
```

### 3. Create version tag
```bash
git tag -a v0.0.1 -m "Release v0.0.1 - First stable release with UX improvements"
```

### 4. Push to both remotes
```bash
# Push main branch to GitHub
git push origin main

# Push main branch to Forgejo
git push forgejo main

# Push tags to GitHub
git push origin v0.0.1

# Push tags to Forgejo
git push forgejo v0.0.1
```

### 5. Verify GitHub Actions
- Check [GitHub Actions](https://github.com/runawaydevil/thefeeder/actions)
- Build should run automatically
- Docker publish will trigger on tag push

## Version Details

**Version:** 0.0.1  
**Release Date:** January 2025  
**Status:** Stable  

### What's New
- Enhanced pagination with visual improvements
- Full-text search system
- Custom sorting options
- Relative time display
- Read article tracking
- Feed status indicators
- Improved image handling
- WCAG AA accessibility compliance
- Contextual empty states

### Technical Details
- Python 3.12
- FastAPI 0.104.1
- Docker ready
- SQLite database
- HTTP/2 support

## Next Steps

After release:
1. Monitor GitHub Actions for build status
2. Test Docker image from registry
3. Update documentation if needed
4. Create release notes on GitHub/Forgejo

