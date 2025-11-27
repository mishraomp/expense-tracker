# Release & Packaging

This feature introduces an automated release and packaging pipeline for the Expense Tracker project.

## What happens on push to `main`
- CI builds and tests the backend and frontend.
- Packages are created:
  - Linux (.deb) package for Ubuntu 24.04+ using `fpm` and includes a systemd service file.
  - Windows MSI package using WiX that installs files under `Program Files` and provides a PowerShell script for service registration.
- Semantic version is computed using `semantic-release` from commit messages (Conventional Commits). A GitHub Release is created using the computed version.

## Local packaging
### Pre-reqs
- Ubuntu: Install Ruby and fpm (gem install fpm) to create `.deb`
- Windows: Install WiX Toolset and Node.js

### Commands
To build both apps:

```bash
npm run build
```

To create a DEB package:

```bash
npm run package:deb
```

To create an MSI (on Windows runner):

```powershell
npm run package:msi
```

## Notes and Recommendations
- The DEB package assumes Node.js is installed on the target host. For production, consider bundling a Node.js runtime or using Docker.
- Similarly, MSI assumes Node is present in PATH. The included service install script uses `sc.exe` to register a Node process as a service.
- To make the release process robust for production, consider using a worker to refresh the materialized view asynchronously via `pg_notify` if heavy write volumes are expected.
