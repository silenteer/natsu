### To dev
To install all packages for root & examples & libs. The workspace will takecare the rest
```
yarn install
```

### To release a library
- This command will rebuild & bump package version & publish to npm registery & create github tag
```
PROJECT=library_path yarn release
```
Ex: `PROJECT=package/natsu yarn release`

### FAQ
- Nats-runner reports error?<br/> Natsu is yet built and Natsu-runner is written in JS. `yarn workspace @silenteer/natsu build` would solve
- example-client uses withTM? <br/> Next.js doesn't read `.ts` file outside of the root dir of the next app. Transpile-module will transpile those reference using babel. You will not this trick if you used released version of the library

**Tips**

Use Npm script explorer in vscode to run command from nested packages by one click.

It won't work with command which need environment variable

http://www.matthiassommer.it/programming/testing/run-npm-scripts-in-visual-studio-code-with-a-click-of-a-button/
