import { LogoMark } from "./Brand";

export default function Header({
  active,
}: {
  active: "voter" | "candidate" | "about";
}) {
  return (
    <>
      <header className="top">
        <a className="brand" href="/" aria-label="Blind Ballot home">
          <LogoMark size={40} onDark />
          <span>
            Blind<span>Ballot</span>
          </span>
        </a>
        <nav aria-label="Main">
          <a href="/" className={active === "voter" ? "on" : ""}>
            Match my ballot
          </a>
          <a href="/candidates" className={active === "candidate" ? "on" : ""}>
            For candidates
          </a>
          <a href="/about" className={active === "about" ? "on" : ""}>
            How it works
          </a>
        </nav>
      </header>
      <div className="bunting" aria-hidden />
    </>
  );
}
