"use client";

import { useRef, useState } from "react";

/**
 * The product demo.
 *
 * Nothing of the video is fetched until someone asks for it: `preload="none"`
 * means the poster frame is the whole cost of the section, and the first click
 * is what starts the download. The frame reserves the recording's own aspect
 * ratio, so the poster arriving never moves the page.
 *
 * It carries an audio track, so it never plays on its own. The overlay is a
 * real button rather than a click handler on the video, which keeps the first
 * play reachable from the keyboard; once it is playing the browser's own
 * controls take over, because they already do transport, volume, full screen,
 * and picture-in-picture better than a bespoke bar would.
 */
export function DemoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function start() {
    setStarted(true);
    video.current?.play();
  }

  return (
    <div className="demo-frame">
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- The recording has
          no spoken audio to caption: its track is music, and every step it takes
          is titled on screen. The section's own copy states what it shows. */}
      <video
        ref={video}
        aria-label="A PlaybookDiff check finding an instruction one agent never receives, and the same check running on a pull request"
        className="demo-video"
        src="/video/PlaybookdiffDemo.mp4"
        poster="/video/PlaybookdiffDemo-poster.jpg"
        preload="none"
        controls={started}
        playsInline
        width={1662}
        height={1080}
      />
      {started ? null : (
        <button className="demo-play" type="button" onClick={start} aria-label="Play the demo">
          <span className="demo-play-mark">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path d="M8 5.2v13.6L19 12z" fill="currentColor" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
