import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import SellItem from './components/SellItem';
import Marketplace from './components/Marketplace';
import Profile from './components/Profile';
import ItemPage from './components/ItemPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketplace />}/>
        <Route path="/sellItem" element={<SellItem />}/> 
        <Route path="/itemPage/:tokenId" element={<ItemPage />}/>        
        <Route path="/profile" element={<Profile />}/> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
