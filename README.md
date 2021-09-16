To install all packages for root & examples & libs
```
yarn install:all
```

To clear all registered symlinks for @silenteer
```
yarn unlink:all
```

To build & link local packages
- If local packages has been built, this command only does link, not rebuild the package
- This command will remove npm packages in `node_modules/@silenteer` then use symlink instead of them
```
yarn link:all
```

To release a library
- This command will rebuild & bump package version & publish to npm registery & create github tag
```
PROJECT=library_path yarn release
```