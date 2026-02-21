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


