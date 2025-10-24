import React from 'react'
import { render, screen } from '@testing-library/react'
import App from '../App'

test('renders project title', () => {
  render(<App />)
  // The app header uses 'Linux AI Assistant'
  const heading = screen.getByRole('heading', { name: /Linux AI Assistant/i })
  expect(heading).toBeTruthy()
})
