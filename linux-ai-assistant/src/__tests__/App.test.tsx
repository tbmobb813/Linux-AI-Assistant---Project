import { render, screen } from '@testing-library/react'
import { act } from 'react'
import App from '../App'

test('renders project title', async () => {
    await act(async () => {
        render(<App />)
    })
    // The sidebar heading is 'Conversations'
    const heading = screen.getByRole('heading', { name: /Conversations/i })
    expect(heading).toBeTruthy()
})
