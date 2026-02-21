/* This example requires Tailwind CSS v2.0+ */
import React, { Fragment, useEffect, useState } from 'react'
import { Link, useParams, } from "react-router-dom";
import { Dialog, Menu, Transition } from '@headlessui/react'
import { GiLaurelsTrophy, GiCutDiamond, GiRoundStar } from 'react-icons/gi';
import { CheckCircleIcon, XCircleIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/solid'
import { XIcon } from '@heroicons/react/outline'
import axios from 'axios'
import Roster from '../../Components/Roster';
import GameModal from '../../Components/GameModal';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
} from '@chakra-ui/react'


export default function Records() {

    const [selection, setSelection] = useState(1)

    const navigation = [
        { name: 'History', selection: 1 },
        { name: 'Record Book', selection: 2 },
        { name: 'Player Stats', selection: 3 },
    ]



    return (
        <div className='flex mt-14'>
            <div className='bg-white'>
                <ul className='flex flex-col mt-2 h-158 w-full'>
                    {navigation.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setSelection(item.selection)}
                            className={`my-2 laptop:w-48 uppercase text-lg text-center font-semibold ${selection === item.selection ? 'text-white bg-slate-900' : 'bg-white text-slate-900 hover:bg-slate-300'}`}
                        >
                            <div className='my-1.5'>{item.name}</div>
                        </button>
                    ))}
                </ul>
            </div>
            <div className='grow'>
                {selection === 1 ?
                    <History />
                    : null
                }
                {selection === 2 ?
                    <RecordBook />
                    : null
                }
            </div>

        </div>
    )

}

function History() {

    const [teams, setTeams] = useState([])
    const [standings, setStandings] = useState([])
    const [season, setSeason] = useState(1)

    const getTeams = async () => {
        try {
            //const userTeams = await axios.get(`http://floosball.com:8000/championshipHistory`)
            const userTeams = await axios.get(`http://localhost:8000/championshipHistory`)

            setTeams(userTeams.data);  // set State

        } catch (err) {
            console.error(err.message);
        }
    };

    const getStandings = async () => {
        try {
            //const userTeams = await axios.get(`http://floosball.com:8000/standingsHistory?season=${season}`)
            const userStandings = await axios.get(`http://localhost:8000/standingsHistory?season=${season}`)

            setStandings(userStandings.data);  // set State

        } catch (err) {
            console.error(err.message);
        }
    };

    useEffect(() => {
        getTeams();

    }, []);

    useEffect(() => {
        getStandings();

    }, [season]);


    return (
        <div className='flex w-full justify-center mt-4'>
            <div className='bg-white w-96 rounded-lg shadow-md h-158 overflow-scroll'>
                <table className='divide-y divide-slate-400 w-full'>
                    <tr className='bg-slate-900'>
                        <td className='flex h-8 items-center text-slate-100 font-semibold'>
                            <div className="w-16 justify-center text-center">Season</div>
                            <div className="w-80 text-center">Champion</div>
                        </td>
                    </tr>
                    {teams.map((team) => (
                        <button className={`hover:bg-slate-100 ${season === team.season ? 'bg-slate-200': null}`} onClick={() => setSeason(team.season)}>
                            <td className='flex h-14 items-center'>
                                <div className='text-base justify-center text-center font-medium w-16'>{team.season}</div>
                                <div className='flex justify-between items-center w-80'>
                                    <div className='items-center py-2 mx-3 laptop:pr-1'>
                                        <div className={`w-6 laptop:w-8 h-6 laptop:h-8 rounded-full`} style={{ backgroundColor: `${team.championColor}` }}></div>
                                    </div>
                                    <div key={team.id} className="text-left w-72">
                                        <Link to={`/team/${team.championId}`} className={`text-lg laptop:text-lg font-bold text-left  truncate hover:underline`}>{team.champion}</Link>
                                        <span className='text-xs italic font-medium'> {team.championRecord}</span>
                                    </div>
                                </div>
                            </td>
                        </button>
                    ))}
                </table>
            </div>
            {standings ?
                <div className='flex flex-col'>
                    <div className='my-1 text-lg laptop:text-lg text-center font-semibold text-slate-700 underline'>Season {season}</div>
                    <div className='laptop:grid grid-cols-2 items-center-4'>
                        {standings.map((division) =>
                            <div className='bg-white rounded-xl shadow-md my-5 mx-2 laptop:mx-6'>
                                <div className='my-1 text-lg laptop:text-lg text-center font-semibold text-slate-700  underline'>{division.divisionName} Division</div>
                                <table id="teamTable" className="min-w-full divide-y divide-slate-300">
                                    <tbody className="divide-y divide-slate-200 text-xl font-normal">
                                        <tr className=' w-60'>
                                            <td className='flex h-8 items-center justify-between'>
                                                <div className="text-left pl-2">
                                                    <div className={`text-base font-semibold text-left`}>Team</div>
                                                </div>
                                                <div className='flex justify-between w-44 mx-1 text-xs laptop:text-sm font-semibold text-center text-slate-900'>
                                                    <div className="w-12">Rating</div>
                                                    <div className="w-6">W</div>
                                                    <div className="w-6">L</div>
                                                    <div className="w-16">WIN %</div>
                                                </div>
                                            </td>
                                        </tr>
                                        {division.teams.map((team) => (
                                            <tr key={team.id}>
                                                <td className='flex h-12 items-center justify-start'>
                                                    <div className='flex justify-start items-center w-88'>
                                                        <div className='items-center py-2 mx-2'>
                                                            <div className={`w-6 laptop:w-6 h-6 laptop:h-6 rounded-full`} style={{ backgroundColor: `${team.color}` }}></div>
                                                        </div>
                                                        <div key={team.id} className="text-left">
                                                            <Link to={`/team/${team.id}`} className={`text-base laptop:text-base font-semibold text-left  truncate hover:underline`}>{team.city} {team.name}</Link>
                                                        </div>
                                                        <div className='flex items-center ml-1'>
                                                            {team.clinchedPlayoffs ? <div className='w-6 text-emerald-500'><CheckCircleIcon className='w-4 h-4' /></div> : null}
                                                            {team.clinchedDivision ? <div className='w-6 text-amber-500'><GiRoundStar className='w-4 h-4' /></div> : null}
                                                            {team.clinchedTopSeed ? <div className='w-6 text-cyan-500'><GiCutDiamond className='w-4 h-4' /> </div> : null}
                                                            {team.leagueChampion ? <div className='w-6 text-amber-500'><GiLaurelsTrophy className='w-4 h-4' /></div> : null}
                                                        </div>
                                                    </div>
                                                    <div className='flex justify-between w-44 mx-1 text-xs laptop:text-base font-normal text-center text-slate-900'>
                                                        <div className="w-12">{team.elo}</div>
                                                        <div className="w-6">{team.wins}</div>
                                                        <div className="w-6">{team.losses}</div>
                                                        <div className="w-16">{team.winPerc}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div> : null}


        </div>
    )

}

function RecordBook() {

    const [records, setRecords] = useState([])
    const [selection, setSelection] = useState(1)

    const getRecords = async () => {
        try {
            //const userRecords = await axios.get(`http://floosball.com:8000/records?selection=${selection}`)
            const userRecords = await axios.get(`http://localhost:8000/records?selection=${selection}`)

            setRecords(userRecords.data);  // set State

        } catch (err) {
            console.error(err.message);
        }
    };


    const navigation = [
        { name: 'Passing', selection: 1 },
        { name: 'Rushing', selection: 2 },
        { name: 'Receiving', selection: 3 },
        { name: 'Kicking', selection: 4 },
        { name: 'Team', selection: 5 },
    ]

    useEffect(() => {
        getRecords();

    }, [selection]);

    return (
        <div className='flex flex-col w-full justify-center'>
            <div className='flex justify-center'>
                <span className="inline-flex rounded-md shadow-sm mt-8">
                    <button
                        type="button"
                        onClick={() => setSelection(1)}
                        className={`relative inline-flex items-center rounded-l-xl border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                        Passing
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelection(2)}
                        className={`relative -ml-px inline-flex items-center border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 2 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                        Rushing
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelection(3)}
                        className={`relative -ml-px inline-flex items-center border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 3 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                        Receiving
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelection(4)}
                        className={`relative -ml-px inline-flex items-center border border-slate-100 px-4 py-2 text-base font-semibold uppercase ${selection === 4 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                        Kicking
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelection(5)}
                        className={`relative -ml-px inline-flex items-center rounded-r-xl border border-slate-100 px-4 py-2 text-semibold font-medium uppercase ${selection === 5 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                        Team
                    </button>

                </span>
            </div>
            <div className='flex flex-col items-center mt-6'>
                <div className='flex flex-col w-138 bg-white rounded-lg items-center'>
                    <div className='text-xl'>All-Time Records</div>
                    <table className='divide-y divide-slate-400 w-full'>
                        <tr>
                            <td className='flex h-6 items-center justify-between space-x-8'>
                                <div className='flex text-sm items-center w-28 pl-2'></div>
                                <div className='flex text-sm laptop:text-lg font-bold justify-center text-slate-900 w-16'></div>
                                <div className="text-center grow"></div>
                                <div className='flex text-sm laptop:text-sm font-normal justify-end text-slate-900 w-8 pr-2'></div>
                            </td>
                        </tr>
                        {records.career?.map((record) => (
                            <tr>
                                <td className='flex h-12 items-center justify-between space-x-8'>
                                    <div className='flex items-center text-sm space-x-1 w-28 pl-2'>{record.record}</div>
                                    <div className='flex justify-center font-bold text-sm laptop:text-lg text-slate-900 w-16'>{record.value}</div>
                                    <div key={record.name} className="text-center grow">
                                        {selection == 6 ?
                                            <Link to={`/team/${record.id}`} className={`text-lg laptop:text-xl font-medium text-left  truncate hover:underline`}>{record.name}</Link>
                                            :
                                            <Link to={`/players/${record.id}`} className={`text-lg laptop:text-xl font-medium text-left  truncate hover:underline`}>{record.name}</Link>
                                        }
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </table>
                </div>
                <div className='flex flex-col w-138 bg-white rounded-lg items-center mt-4'>
                    <div className='text-xl'>Game Records</div>
                    <table className='divide-y divide-slate-400 w-full'>
                        <tr>
                            <td className='flex h-6 items-center justify-between space-x-8'>
                                <div className='flex text-sm items-center w-28 pl-2'></div>
                                <div className='flex text-sm laptop:text-lg font-bold justify-center text-slate-900 w-16'></div>
                                <div className="text-center grow"></div>
                                <div className='flex text-sm laptop:text-sm font-normal justify-end text-slate-900 w-8 pr-2'></div>
                            </td>
                        </tr>
                        {records.game?.map((record) => (
                            <tr>
                                <td className='flex h-12 items-center justify-between space-x-8'>
                                    <div className='flex items-center text-sm space-x-1 w-28 pl-2'>{record.record}</div>
                                    <div className='flex justify-center font-bold text-sm laptop:text-lg text-slate-900 w-16'>{record.value}</div>
                                    <div key={record.name} className="text-center grow">
                                        {selection == 6 ?
                                            <Link to={`/team/${record.id}`} className={`text-lg laptop:text-xl font-medium text-left  truncate hover:underline`}>{record.name}</Link>
                                            :
                                            <Link to={`/players/${record.id}`} className={`text-lg laptop:text-xl font-medium text-left  truncate hover:underline`}>{record.name}</Link>
                                        }
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </table>
                </div>
                <div className='flex flex-col w-138 bg-white rounded-lg items-center mt-4'>
                    <div className='text-xl'>Season Records</div>
                    <table className='divide-y divide-slate-400 w-full'>
                        <tr>
                            <td className='flex h-6 items-center justify-between space-x-6'>
                                <div className='flex text-sm items-center w-28 pl-2'></div>
                                <div className='flex text-sm laptop:text-lg font-bold justify-center text-slate-900 w-16'></div>
                                <div className="text-center grow"></div>
                                <div className='flex text-sm laptop:text-sm font-normal justify-end text-slate-900 w-8 pr-2'>Season</div>
                            </td>
                        </tr>
                        {records.season?.map((record) => (
                            <tr>
                                <td className='flex h-12 items-center justify-between space-x-8'>
                                    <div className='flex text-sm items-center w-28 pl-2'>{record.record}</div>
                                    <div className='flex text-sm laptop:text-lg font-bold justify-center text-slate-900 w-16'>{record.value}</div>
                                    <div key={record.name} className="text-center grow">
                                        {selection == 6 ?
                                            <Link to={`/team/${record.id}`} className={`text-lg laptop:text-xl font-medium text-left  truncate hover:underline`}>{record.name}</Link>
                                            :
                                            <Link to={`/players/${record.id}`} className={`text-lg laptop:text-xl font-medium text-left  truncate hover:underline`}>{record.name}</Link>
                                        }
                                    </div>
                                    <div className='flex text-sm laptop:text-lg font-normal justify-end text-slate-900 w-8 pr-2'>{record.season}</div>
                                </td>
                            </tr>
                        ))}
                    </table>
                </div>
            </div>
        </div>
    )

}