import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from './lib/api';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { CollectionsProvider } from './contexts/CollectionsContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Home from './app/Home';
import Explorar from './app/Explorar';
import Feed from './app/Feed';
import Item from './app/Item';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <CollectionsProvider>
          <ToastProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explorar />} />
                  <Route path="/feed/:id" element={<Feed />} />
                  <Route path="/item/:id" element={<Item />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </ToastProvider>
        </CollectionsProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

export default App;
