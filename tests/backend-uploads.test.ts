import { test } from "node:test";
import assert from "node:assert/strict";
import { imageMime } from "../lib/server/uploads";
test("portfolio only accepts supported raster magic and matching extension", () => {
  assert.equal(
    imageMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "photo.png"),
    "image/png",
  );
  assert.equal(
    imageMime(Buffer.from([255, 216, 255]), "photo.jpg"),
    "image/jpeg",
  );
  assert.equal(
    imageMime(Buffer.from("RIFF0000WEBP"), "photo.webp"),
    "image/webp",
  );
  assert.throws(() =>
    imageMime(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      "photo.svg",
    ),
  );
  assert.throws(() =>
    imageMime(Buffer.from("<script>alert(1)</script>"), "photo.jpg"),
  );
  assert.throws(() =>
    imageMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "photo.jpg"),
  );
});
