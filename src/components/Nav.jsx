function Nav() {
  return (
    <nav>
      <div className="links">
        <a href="/assets/seung_gyu_kang_resume.pdf" target="_blank">
          <i className="fas fa-file-alt" />
        </a>
        <a href="https://github.com/davidsgk" target="_blank" rel="noreferrer">
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
    </nav>
  );
}

export default Nav;
