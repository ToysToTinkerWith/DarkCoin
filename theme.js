import { createTheme, responsiveFontSizes } from '@mui/material/styles';


let theme = createTheme({
  palette: {
    primary: {
      main: "#000000",
    },
    secondary: {
      main: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: [
      '"Uncial Antiqua"',
      
    ]
  },
})

theme = responsiveFontSizes(theme)

export default theme