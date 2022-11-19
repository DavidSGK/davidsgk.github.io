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
- "Orbit" polar formula (2D) for transitions

    $$r = \left( \left( \frac{r_2 - r_1}{\theta_t - \theta_s} \right) (\theta - \theta_s) + r_1 \right) \left( k \sin \left( \frac{\pi}{\theta_t - \theta_s} \right) (\theta - \theta_s) + 1 \right)$$

    - Allows:
        - Start from current vector's radius and angle
        - End at target vector's radius and angle
        - Make an (ideally) aesthetically pleasing orbital path to reach the destination
    - Breakdown:
        - First half scales radius linearly from start to end, assuming right side produces a path that starts and ends with unit radius
        - Second half produces orbital path, starting and ending with unit radius
        - Input: $\theta$ the current progress angle, in range of $[\theta_1, \theta_2]$
        - Output: $r$ the radius of the vector at the current angle
        - Ohters: $k$ a random coefficient
    - To produce more orbits, simply increment $\theta_2$ by multiples of $2\pi$
    - Tested using Desmos graphing calculator 
- Personal work environment: Windows 10/WSL 2 (Ubuntu)
    - Dev/build scripts likely won't work properly on a non-UNIX/Linux environment