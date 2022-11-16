# Personal Website


## Dependencies
- NodeJS/NPM/Yarn
- Use Parcel for building/bundling
- React.js
- Three.js
- Assets (mostly) handmade
    - Favicons generated using [this](https://realfavicongenerator.net/) website


## Commands

### Start dev build
```
yarn start
```

### Build for prod
```
yarn build
```
Artifacts are built into `./dist`.

### Push to GitHub Pages
```
yarn push-gh-pages
```
Pushes the `./dist` folder to the branch `gh-pages`. GitHub repo should be configured to build/deploy from this branch correctly.

## Notes
- Personal work environment: Windows 10/WSL 2 (Ubuntu)
    - Dev/build scripts likely won't work properly on a non-UNIX/Linux environment