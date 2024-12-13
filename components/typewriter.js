import React, { useState, useEffect } from 'react';

import { Grid, Typography, Button, TextField } from "@mui/material"


const Typewriter = ({ text, delay }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (text.length == 0) {
        setCurrentText("");
        setCurrentIndex(0);
    }
    else if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
  
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return <Typography style={{padding: 20}} color="secondary">{currentText}</Typography>;
};

export default Typewriter;