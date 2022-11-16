import React from "react";
import Graphic from "./Graphic";

const App = () => {
  return (
    <React.Fragment>
      <Graphic />
      <section className="main">
        <div className="landing">
          <h1 className="name pixel">David Kang</h1>
          <h3 className="desc">Software Engineer | University of Waterloo '21</h3>
          <h3 className="looking">Seeking full-time opportunities | Ex-Meta, Ex-Google</h3>
          <div className="links">
            <a className="fas fa-file-alt" href="/assets/seung_gyu_kang_resume.pdf" target="_blank"></a>
            <a className="fab fa-github" href="https://github.com/davidsgk" target="_blank"></a>
            <a className="fab fa-linkedin-in" href="https://www.linkedin.com/in/davidsgk" target="_blank"></a>
            <a className="fas fa-envelope" href="mailto:david.kang@uwaterloo.ca"></a>
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

export default App;