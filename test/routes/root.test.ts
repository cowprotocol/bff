import { build } from "../helper";

const app = build();

test("default root route", async () => {
  const res = await app.inject({
    url: "/",
  });
  expect(res.json()).toEqual({ root: true });
});
