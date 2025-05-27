import React from 'react';
import { createRoot } from 'react-dom/client';
import LogReplayer from './replayer';

const element = document.getElementById('root');
createRoot(element).render(<LogReplayer />);