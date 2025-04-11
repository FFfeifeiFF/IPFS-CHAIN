import Header from '../components/Header';
import SearchResults from '../components/SearchResults';
import Footer from '../components/Footer';
import React from 'react';
import '../css/Index.css'; // 引入 CSS 样式文件
//查询界面
function Search() {
    return (
        <div className="container">
            <Header/>
            <div className="content-area">
                <SearchResults/>
            </div>
            <Footer/>
        </div>
    );
}


export default Search;