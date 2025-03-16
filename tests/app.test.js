const request = require("supertest");
const app = require("../server"); // Import app without starting a server

describe("GET /applications", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/applications");
    expect(res.statusCode).toEqual(200);
  });
});

