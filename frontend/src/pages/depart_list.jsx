//用户登入后的界面展示
import Head from '../components/Head';
import Footer from '../components/Footer';
import React from 'react';
import '../css/Index.css';
import ArticleList from "../components/ArticleList";
import { useLocation } from 'react-router-dom';

function Departlist() {
    const location = useLocation();
    const username = location.state?.username;

    return (
        <div className="app-container">
            <Head username={username}/>
            <div className="main-container">
                <ArticleList username={username}/>
            </div>
            <Footer/>
        </div>
    );
}

export default Departlist;