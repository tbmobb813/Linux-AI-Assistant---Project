import React from 'react'
import { render, screen } from '@testing-library/react'
import App from '../App'

test('renders project title', () => {
  render(<App />)
  // The README/project has the title 'Linux AI Desktop Assistant - Project Documentation'
  const el = screen.getByText(/Linux AI Desktop Assistant/i)
  expect(el).toBeInTheDocument()
})
