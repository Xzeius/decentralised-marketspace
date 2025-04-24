import './App.css';
import Navbar from './components/Navbar.js';
import Marketplace from './components/Marketplace';
import Profile from './components/Profile';
import SellItem from './components/SellItem';
import ItemPage from './components/ItemPage';
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

function App() {
  return (
    <div className="container">
        <Routes>
          <Route path="/" element={<Marketplace />}/>
          <Route path="/itemPage/:tokenId" element={<ItemPage />}/>        
          <Route path="/profile" element={<Profile />}/>
          <Route path="/sellItem" element={<SellItem />}/>             
        </Routes>
    </div>
  );
}

export default App;
