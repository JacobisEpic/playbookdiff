import { buttondownConfigured, buttondownSubscribeUrl } from "../lib/site";

/**
 * The project update list.
 *
 * An ordinary HTML form POST straight to Buttondown's embed endpoint: no API
 * route, no server action, no subscriber storage here, and no JavaScript in
 * the path, so it keeps working when a script fails and Buttondown being down
 * can only affect the submission. The username is configured once in
 * `lib/site.ts`; until it is set, nothing is rendered rather than a form that
 * looks live and posts nowhere.
 */
export function Signup() {
  if (!buttondownConfigured) return null;

  return (
    <section className="section container" id="updates" aria-labelledby="updates-title">
      <div className="prose">
        <h2 id="updates-title">Keep up with PlaybookDiff.</h2>
        <p>
          New releases, support for more coding agents, and important project updates. Occasional
          emails only.
        </p>
      </div>

      <form className="signup" action={buttondownSubscribeUrl} method="post">
        <label className="visually-hidden" htmlFor="signup-email">
          Email address
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        {/* Buttondown's own flag for an embedded form. */}
        <input type="hidden" name="embed" value="1" />
        <button className="button button-primary" type="submit">
          Get updates
        </button>
      </form>

      <p className="footnote">
        Unsubscribe anytime. <a href="/privacy">What happens to your address</a>.
      </p>
    </section>
  );
}
