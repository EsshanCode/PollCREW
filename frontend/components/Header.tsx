import { LogoMark } from "./Brand";

export default function Header({ active }: { active: "voter" | "candidate" }) {
  return (
    <>
      <header className="top">
        <a className="brand" href="/" aria-label="Blind Ballot home">
          <LogoMark size={40} />
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
        </nav>
      </header>
      <div className="bunting" aria-hidden />
    </>
  );
}
