import "./setup";

import { generateTitle } from "../index";

describe("Title Generation", () => {
  it("Should generate a relevant title", async () => {
    const title = await generateTitle(
      "This summer I went on holiday to Italy for 5 days and this is what I unexpectedly learned about how to drive a car."
    );
    expect(title).toBeSimilarTo("Italy's Unexpected Driving Lessons", {
      level: "normal",
      threshold: 0.75,
      samples: 5,
    });
  });

  it("Should generate a title that infers the brand name", async () => {
    const title = await generateTitle(
      "This burger restaurant's mascot is a red and yellow clown but their new menu item is no joke."
    );
    expect(title).toMention("McDonald's");
  });

  it("Should not be semantically close to unrelated content", async () => {
    const title = await generateTitle(
      "A beginner's guide to making sourdough bread at home with simple ingredients."
    );
    expect(title).not.toBeVectorSimilarTo("How to repair a broken car engine", {
      threshold: 0.8,
    });
  });
});
