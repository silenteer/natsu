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


**Tips**

Use Npm script explorer in vscode to run command from nested packages by one click.

It won't work with command which need environment variable

http://www.matthiassommer.it/programming/testing/run-npm-scripts-in-visual-studio-code-with-a-click-of-a-button/



To clear all @silenteer symlink in local
```
rm -rf ~/.config/yarn/link/@silenteer/*
```