import { render, screen } from "@testing-library/react";
import { act } from "react";
import App from "../App";

test("renders project title", async () => {
  await act(async () => {
    render(<App />);
  });
  // The sidebar heading is 'Conversations'
  const heading = screen.getByRole("heading", { name: /Conversations/i });
  expect(heading).toBeTruthy();
});

test("opens settings panel and shows global shortcut field", async () => {
  await act(async () => {
    render(<App />);
  });
  const settingsBtn = screen.getByRole("button", { name: /Settings/i });
  await act(async () => {
    settingsBtn.click();
  });
  const input = await screen.findByLabelText(/Global shortcut/i);
  expect(input).toBeTruthy();
});
