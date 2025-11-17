import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('menampilkan heading utama Sahala Barber', () => {
    render(<LandingPage />)

    expect(
      screen.getByRole('heading', {
        name: /komprehensif booking & manajemen barbershop/i,
      }),
    ).toBeInTheDocument()
  })
})
