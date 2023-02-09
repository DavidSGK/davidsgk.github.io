function Nav() {
  return (
    <nav>
      <div className="links">
        <a href="/assets/seung_gyu_kang_resume.pdf" target="_blank">
          <svg viewBox="0 0 128 128">
            <use href="#file" />
          </svg>
        </a>
        <a href="https://github.com/davidsgk" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 128 128">
            <use href="#github" />
          </svg>
        </a>
        <a
          href="https://www.linkedin.com/in/davidsgk"
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 128 128">
            <use href="#linkedin" />
          </svg>
        </a>
        <a href="mailto:davidsgkang@gmail.com">
          <svg viewBox="0 0 128 128">
            <use href="#mail" />
          </svg>
        </a>
      </div>
    </nav>
  );
}

export default Nav;
