import * as React from "react";
import Graphic from "./Graphic";

function App() {
  return (
    <React.StrictMode>
      <Graphic />
      <section className="main">
        <div className="landing">
          <h1 className="name pixel">David Kang</h1>
          <h3 className="desc">
            Software Engineer | University of Waterloo &apos;21
          </h3>
          <h3 className="looking">
            Seeking full-time opportunities | Ex-Meta, Ex-Google
          </h3>
          <div className="links">
            <a href="/assets/seung_gyu_kang_resume.pdf" target="_blank">
              <i className="fas fa-file-alt" />
            </a>
            <a
              href="https://github.com/davidsgk"
              target="_blank"
              rel="noreferrer"
            >
              <i className="fab fa-github" />
            </a>
            <a
              href="https://www.linkedin.com/in/davidsgk"
              target="_blank"
              rel="noreferrer"
            >
              <i className="fab fa-linkedin-in" />
            </a>
            <a href="mailto:davidsgkang@gmail.com">
              <i className="fas fa-envelope" />
            </a>
          </div>
        </div>
      </section>
    </React.StrictMode>
  );
}

export default App;
