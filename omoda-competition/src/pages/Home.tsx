import { Link } from "react-router-dom";
import homepagePhoto from "@/images/homepage photo.png";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div
          className="home-hero__backdrop"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(4, 6, 8, .96) 0%, rgba(5, 8, 12, .82) 31%, rgba(9, 12, 16, .2) 73%), linear-gradient(0deg, rgba(3, 4, 5, .92), transparent 48%), url("${homepagePhoto}")` }}
        />
        <div className="container-page home-hero__content">
          <p className="home-kicker">WIN THE</p>
          <h1>OMODA <span>C5</span></h1>
          <p className="home-lede">Your next car could be the OMODA C5.<br />Enter for only R100 and stand a chance to win!</p>
          <div className="home-details">
            <Detail icon="◇" label="Entry" value="R100" />
            <Detail icon="□" label="Prize" value="OMODA C5" />
            <Detail icon="▣" label="Closing date" value="31 OCT 2026" />
          </div>
          <div className="home-actions">
            <Link to="/enter" className="btn-primary">Enter Now - R100</Link>
            <Link to="/competition" className="btn-secondary">View Competition</Link>
          </div>
          <p className="home-disclaimer">Entering does not guarantee winning. T's &amp; C's apply.</p>
          <Stats />
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="container-page">
          <p className="section-kicker">HOW IT WORKS</p>
          <h2>It's easy to enter and stand a chance to win.</h2>
          <div className="steps">
            <Step number="1" title="Create an account" body="Sign up or log in to your account." icon="♙" />
            <Step number="2" title="Enter & confirm" body="Complete the required details and accept the competition rules." icon="☑" />
            <Step number="3" title="Pay R100" body="Make your payment securely online." icon="▤" />
            <Step number="4" title="Get your entry" body="Receive your unique entry number and you're in the draw!" icon="◇" />
          </div>
          <Link to="/enter" className="btn-primary how-cta">Enter Now - R100</Link>
        </div>
      </section>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="home-detail">
      <span className="home-detail__icon">{icon}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

function Stats() {
  return <div className="home-stats">
    <div><span className="stat-icon">♧</span><span><small>Total entries</small><strong>2,458</strong><em>and counting</em></span></div>
    <div><span className="stat-icon">◔</span><span><small>Entries remaining</small><strong>7,542</strong><em>of 10,000</em></span></div>
    <div className="progress-stat"><span><small>Competition progress</small><strong>24%</strong><em>towards our goal</em><i><b /></i></span></div>
    <div className="close-stat"><span><small>Competition closes in</small><strong><b>73</b><b>14</b><b>26</b><b>38</b></strong><em><b>DAYS</b><b>HRS</b><b>MINS</b><b>SECS</b></em></span><small>▣ &nbsp;31 October 2026, 23:59</small></div>
  </div>;
}

function Step({ number, title, body, icon }: { number: string; title: string; body: string; icon: string }) {
  return <div className="step"><span className="step-number">{number}</span><span className="step-icon">{icon}</span><div><h3>{title}</h3><p>{body}</p></div></div>;
}
