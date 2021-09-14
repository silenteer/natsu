**Install all node modules**

Apps/Libs can have dependencies with different version which declared in their package.json

But they also share dependencies with same version which declared in package.json at root

To install all these dependencies, run this command at root
```
yarn install-all
```


**Build App/Lib**

At root, run this command
```
yarn build [app/lib name]
```
`[app/lib name]` is name of app/lib which declared in `nx.json`. Normally, it same project folder name.


**Test App/Lib**

At root, run this command
```
yarn test [app/lib name]
```
`[app/lib name]` is name of app/lib which declared in `nx.json`. Normally, it same project folder name.


**Start App**

At root, run this command
```
yarn start [app name]
```
`[app name]` is name of app which declared in `nx.json`. Normally, it same project folder name.


**Release Lib**

At root, run this command
```
yarn release [lib name]
```
`[lib name]` is name of app/lib which declared in `nx.json`. Normally, it same project folder name.
