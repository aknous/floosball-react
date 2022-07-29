/* This example requires Tailwind CSS v2.0+ */
import { MailIcon, PhoneIcon } from '@heroicons/react/solid'

const people = [
  {
    id: 8,
    homeTeam: 'Las Vegas Residents',
    awayTeam: 'Miami Jetskis',
    homeScore: '13',
    awayScore: '21',
    quarter: '4',
  },
  {
    id: 2,
    homeTeam: 'Phoenix Dry Heat',
    awayTeam: 'Boston Apples',
    homeScore: '7',
    awayScore: '13',
    quarter: '1',
  },
  {
    id: 3,
    homeTeam: 'Philadelphia Broads',
    awayTeam: 'Washington Companions',
    homeScore: '14',
    awayScore: '14',
    quarter: '3',
  },
  {
    id: 4,
    homeTeam: 'Seattle Cranes',
    awayTeam: 'Toronto Imaginaries',
    homeScore: '10',
    awayScore: '14',
    quarter: '2',
  },
  {
    id: 5,
    homeTeam: 'Baltimore Oldbays',
    awayTeam: 'Cleveland Rocks',
    homeScore: '3',
    awayScore: '14',
    quarter: '2',
  },
  {
    id: 6,
    homeTeam: 'Tampa Bay Bees',
    awayTeam: 'Chicago Beans',
    homeScore: '14',
    awayScore: '14',
    quarter: '2',
  },
  {
    id: 7,
    homeTeam: 'Denver Northern Lights',
    awayTeam: 'Pittsburgh Melons',
    homeScore: '7',
    awayScore: '21',
    quarter: '2',
  },
  {
    id: 8,
    homeTeam: 'San Diego Sand Dollars',
    awayTeam: 'New York Buildings',
    homeScore: '0',
    awayScore: '7',
    quarter: '2',
  },
  // More people...
]

export default function Example() {
  return (
    <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 mx-10 mt-10">
      {people.map((game) => (
        <li key={game.id} className="col-span-1 bg-stone-50 rounded-lg shadow divide-y divide-stone-200 hover:bg-stone-100">
          <div className="w-full flex items-center justify-between p-6 space-x-6">
            <div className="flex-1 truncate">
              <div className="flex items-center space-x-3">
                <h1 className="text-gray-900 text-lg font-medium truncate">{game.homeTeam}</h1>
                <p className="text-gray-500 text-lg truncate">{game.homeScore}</p>
              </div>
              <div className="flex items-center space-x-3">
                <h2 className="text-gray-900 text-lg font-medium truncate">{game.awayTeam}</h2>
                <p className="text-gray-500 text-lg truncate">{game.awayScore}</p>
              </div>
              <p className="text-gray-500 text-med truncate">{game.quarter}</p>
            </div>
            
          </div>
          <div>
            <div className="-mt-px flex divide-x divide-gray-200">
              <div className="w-0 flex-1 flex">
                <a
                  href="/#"
                  className="relative -mr-px w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-bl-lg hover:text-gray-500"
                >
                  <MailIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <span className="ml-3">Email</span>
                </a>
              </div>
              <div className="-ml-px w-0 flex-1 flex">
                <a
                  href="/#"
                  className="relative w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-br-lg hover:text-gray-500"
                >
                  <PhoneIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <span className="ml-3">Call</span>
                </a>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
