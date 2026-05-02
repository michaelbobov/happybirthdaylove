# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-receiver-flow.spec.ts >> debug receiver delivery and time lock >> sender editor saves a new letter that receiver reveal returns
- Location: tests\e2e\debug-receiver-flow.spec.ts:171:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3000/#access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6ImVkZTFhOWJlLTAwNDItNDg1Ni04MGY5LWEzZGY3N2Y5NzE4YyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3pmZG13dm95a3BneXR5c3hieGNyLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjYjdjODQ4ZS1mMTNlLTRiZTAtOWM4Ni0xMzI2YmM3MGE2MDkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc3NzAxMjk1LCJpYXQiOjE3Nzc2OTc2OTUsImVtYWlsIjoiZGVidWctc2VuZGVyLW1vbnZiMTVvQHRlc3QuZW52ZWxvcGVkLmRldiIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc3NzY5NzY5NX1dLCJzZXNzaW9uX2lkIjoiNmY1MmRjZDAtMzI0Zi00ZDljLThhOWUtMjYyZGU3MjRlOTUxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.jqUQJMewi2rMHcCQu3KSaLaS05VNkdEeoZJtxac0dNsX0zFT4xFK2NDtzjg8QNTE4vJrlIzCB7fN83-UvAlRmw&expires_at=1777701295&expires_in=3600&refresh_token=tux2o4cdw5xt&sb=&token_type=bearer&type=magiclink"
============================================================
```

# Test source

```ts
  82  |       },
  83  |       {
  84  |         bundle_id: bundle.id,
  85  |         order_index: 1,
  86  |         title: "Future locked envelope",
  87  |         caption: "Should not open yet",
  88  |         unlock_type: "date",
  89  |         unlock_at: futureUnlockAt,
  90  |         envelope_design_id: "kraft-classic",
  91  |       },
  92  |     ])
  93  |     .select("id, unlock_type");
  94  |   if (envelopeError || !envelopes) throw new Error(envelopeError?.message ?? "Failed to create envelopes");
  95  | 
  96  |   const immediateEnvelopeId = envelopes.find((row) => row.unlock_type === "immediate")!.id;
  97  |   const futureEnvelopeId = envelopes.find((row) => row.unlock_type === "date")!.id;
  98  | 
  99  |   const { error: itemError } = await admin.from("envelope_items").insert([
  100 |     {
  101 |       envelope_id: immediateEnvelopeId,
  102 |       order_index: 0,
  103 |       type: "text",
  104 |       payload_encrypted: encryptPayload({
  105 |         type: "text",
  106 |         mode: "typed",
  107 |         html: `<p>${immediateMessage}</p>`,
  108 |         paperStyle: "blank",
  109 |       }),
  110 |       meta_json: {},
  111 |     },
  112 |     {
  113 |       envelope_id: futureEnvelopeId,
  114 |       order_index: 0,
  115 |       type: "text",
  116 |       payload_encrypted: encryptPayload({
  117 |         type: "text",
  118 |         mode: "typed",
  119 |         html: `<p>${futureMessage}</p>`,
  120 |         paperStyle: "blank",
  121 |       }),
  122 |       meta_json: {},
  123 |     },
  124 |   ]);
  125 |   if (itemError) throw new Error(itemError.message);
  126 | 
  127 |   return {
  128 |     admin,
  129 |     senderId: sender.user.id,
  130 |     senderEmail,
  131 |     bundleId: bundle.id,
  132 |     token,
  133 |     immediateEnvelopeId,
  134 |     futureEnvelopeId,
  135 |     immediateMessage,
  136 |     futureMessage,
  137 |   };
  138 | }
  139 | 
  140 | test.describe("debug receiver delivery and time lock", () => {
  141 |   let flow: SeededFlow;
  142 | 
  143 |   test.beforeAll(async () => {
  144 |     flow = await seedFlow();
  145 |   });
  146 | 
  147 |   test.afterAll(async () => {
  148 |     if (!flow) return;
  149 |     await flow.admin.from("bundles").delete().eq("id", flow.bundleId);
  150 |     await flow.admin.auth.admin.deleteUser(flow.senderId);
  151 |   });
  152 | 
  153 |   test("receiver sees and opens the sender's saved item", async ({ page }) => {
  154 |     await page.goto(`/b/${flow.token}`);
  155 |     await expect(page.getByRole("heading", { name: /debug receiver flow/i })).toBeVisible();
  156 |     await expect(page.getByRole("link", { name: /immediate test envelope/i })).toBeVisible();
  157 | 
  158 |     const apiResponse = await page.request.post(`/api/reveal/${flow.immediateEnvelopeId}`, {
  159 |       data: { token: flow.token },
  160 |     });
  161 |     expect(apiResponse.status()).toBe(200);
  162 |     const apiBody = await apiResponse.json();
  163 |     expect(apiBody.items).toHaveLength(1);
  164 |     expect(apiBody.items[0].payload.html).toContain(flow.immediateMessage);
  165 | 
  166 |     await page.goto(`/b/${flow.token}/e/${flow.immediateEnvelopeId}`);
  167 |     await page.waitForResponse(`**/api/reveal/${flow.immediateEnvelopeId}`);
  168 |     await expect(page.getByText(flow.immediateMessage)).toBeVisible({ timeout: 10_000 });
  169 |   });
  170 | 
  171 |   test("sender editor saves a new letter that receiver reveal returns", async ({ page }) => {
  172 |     const uiMessage = `UI sender saved this letter ${Date.now().toString(36)}`;
  173 |     const { data: linkData, error: linkError } = await flow.admin.auth.admin.generateLink({
  174 |       type: "magiclink",
  175 |       email: flow.senderEmail,
  176 |     });
  177 |     if (linkError || !linkData?.properties?.action_link) {
  178 |       throw new Error(linkError?.message ?? "Failed to create sender magic link");
  179 |     }
  180 | 
  181 |     await page.goto(linkData.properties.action_link);
> 182 |     await page.waitForURL(/\/dashboard|\/create|\/$/);
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  183 |     await page.goto(`/bundle/${flow.bundleId}/edit`);
  184 |     await expect(page).not.toHaveURL(/sign-in/);
  185 |     await expect(page.getByRole("heading", { name: /debug receiver flow/i })).toBeVisible();
  186 | 
  187 |     await page.getByRole("button", { name: /^Letter$/i }).click();
  188 |     await page.getByPlaceholder(/write your letter/i).fill(uiMessage);
  189 |     await page.getByRole("button", { name: /seal this letter/i }).click();
  190 | 
  191 |     await expect.poll(async () => {
  192 |       const response = await page.request.post(`/api/reveal/${flow.immediateEnvelopeId}`, {
  193 |         data: { token: flow.token },
  194 |       });
  195 |       if (!response.ok()) return "";
  196 |       const body = await response.json();
  197 |       return JSON.stringify(body.items);
  198 |     }, { timeout: 10_000 }).toContain(uiMessage);
  199 |   });
  200 | 
  201 |   test("future date lock blocks direct reveal and does not leak contents", async ({ page }) => {
  202 |     await page.goto(`/b/${flow.token}`);
  203 |     await expect(page.getByText(/future locked envelope/i)).toBeVisible();
  204 |     await expect(page.getByRole("link", { name: /future locked envelope/i })).toHaveCount(0);
  205 | 
  206 |     const apiResponse = await page.request.post(`/api/reveal/${flow.futureEnvelopeId}`, {
  207 |       data: { token: flow.token },
  208 |     });
  209 |     expect(apiResponse.status()).toBe(423);
  210 |     const apiBody = await apiResponse.json();
  211 |     expect(apiBody.error).toBe("locked_until");
  212 |     expect(apiBody.unlockAt).toBeTruthy();
  213 | 
  214 |     await page.goto(`/b/${flow.token}/e/${flow.futureEnvelopeId}`);
  215 |     await page.waitForResponse(`**/api/reveal/${flow.futureEnvelopeId}`);
  216 |     await expect(page.getByText(/not yet/i)).toBeVisible();
  217 |     await expect(page.getByText(flow.futureMessage)).toHaveCount(0);
  218 |   });
  219 | });
  220 | 
```