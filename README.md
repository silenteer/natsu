To install all packages for root & examples & libs
```
yarn install:all
```

To build & link local packages
- If local packages has been built, this command only does link, not rebuild the package
- This command will remove npm packages in `node_modules/@silenteer` then use symlink instead of them
```
yarn dev:enter
```

To clear all registered symlinks for @silenteer
- This command will remove symlinks in `node_modules/@silenteer` then use npm packages instead of them
```
yarn dev:exit
```

To release a library
- This command will rebuild & bump package version & publish to npm registery & create github tag
```
PROJECT=library_path yarn release
```
Ex: `PROJECT=libs/natsu yarn release`