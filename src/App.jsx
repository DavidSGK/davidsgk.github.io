import React from "react";
import Graphic from "./Graphic";

const App = () => {
  return (
    <React.Fragment>
      <Graphic />
      <section class="main">
        <div class="landing">
          <h1 class="name pixel">David Kang</h1>
          <h3 class="desc">Software Engineer | University of Waterloo '21</h3>
          <h3 class="looking">Seeking full-time opportunities | Ex-Meta, Ex-Google</h3>
          <div class="links">
            <a class="fas fa-file-alt" href="/assets/seung_gyu_kang_resume.pdf" target="_blank"></a>
            <a class="fab fa-github" href="https://github.com/davidsgk" target="_blank"></a>
            <a class="fab fa-linkedin-in" href="https://www.linkedin.com/in/davidsgk" target="_blank"></a>
            <a class="fas fa-envelope" href="mailto:david.kang@uwaterloo.ca"></a>
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

export default App;