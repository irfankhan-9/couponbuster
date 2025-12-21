import React, { useState } from 'react';
// Re-writing import to fix potential resolution issues with react-router-dom
import { Link } from 'react-router-dom';
import { 
  Trophy, CheckCircle, ArrowRight, Shield, Users, 
  PiggyBank, XCircle, Star, ChevronDown, ChevronUp, Lock 
} from 'lucide-react';
import { TEAMS } from '../constants';

export const Landing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handlePreventDefault = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* 1. Navigation Bar */}
      <nav className="bg-emerald-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <span className="font-bold text-xl tracking-tight">Coupon Busters</span>
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-medium text-emerald-100">
              <a href="#how-it-works" className="hover:text-white transition">How it Works</a>
              <a href="#benefits" className="hover:text-white transition">Benefits</a>
              <a href="#pricing" className="hover:text-white transition">The Split</a>
              <a href="#faq" className="hover:text-white transition">FAQ</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/leagues" className="text-emerald-100 hover:text-white font-medium text-sm">Login</Link>
              <Link 
                to="/leagues" 
                className="bg-yellow-500 hover:bg-yellow-400 text-emerald-900 font-bold py-2 px-5 rounded-full transition-all duration-200 shadow-lg hover:shadow-yellow-400/20 active:scale-95 transform"
              >
                Start a League
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative bg-emerald-900 text-white overflow-hidden pt-16 pb-24">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center bg-emerald-800 rounded-full px-4 py-1.5 text-xs font-semibold text-yellow-400 mb-6 border border-emerald-700">
              <Star className="h-3 w-3 mr-1.5" />
              New Season Registration Open
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              The Football Betting League That <span className="text-yellow-400">Builds a Pot.</span>
            </h1>
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed max-w-lg">
              Run your work or pub syndicate without the headache. We coordinate your picks, your results, and your pot growth. You just pick the winners.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/leagues" className="inline-flex justify-center items-center bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold py-4 px-8 rounded-lg shadow-xl transition-all hover:-translate-y-1 hover:shadow-emerald-500/30 active:scale-95">
                Create Your League
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a 
                href="#how-it-works"
                className="inline-flex justify-center items-center bg-transparent border-2 border-emerald-700 text-emerald-100 hover:bg-emerald-800/30 hover:text-white hover:border-emerald-600 font-semibold py-4 px-8 rounded-lg transition-all active:scale-95"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
             <div className="absolute -inset-4 bg-emerald-500/20 blur-xl rounded-full"></div>
             <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                {/* Mock Card UI */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                    <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Total Pot</div>
                        <div className="text-3xl font-bold text-white">£1,250.00</div>
                    </div>
                    <div className="h-10 w-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Trophy className="text-emerald-900 h-6 w-6" />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white mr-3">CC</div>
                            <span className="text-slate-200">Cardiff City</span>
                        </div>
                        <span className="text-emerald-400 font-mono">WON 2-0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                         <div className="flex items-center">
                            <div className="w-8 h-8 rounded bg-white flex items-center justify-center font-bold text-black mr-3">SC</div>
                            <span className="text-slate-200">Swansea City</span>
                        </div>
                        <span className="text-emerald-400 font-mono">WON 1-0</span>
                    </div>
                    <div className="mt-4 pt-4 text-center">
                        <div className="inline-block bg-emerald-600 text-white text-xs px-3 py-1 rounded-full uppercase font-bold tracking-wide">
                            Coupon Landed!
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof */}
      <section className="bg-emerald-800 border-b border-emerald-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-emerald-700">
                <div className="p-2">
                    <div className="text-3xl font-bold text-white mb-1">£50,000+</div>
                    <div className="text-emerald-200 text-sm font-medium">Coordinated This Season</div>
                </div>
                <div className="p-2">
                    <div className="text-3xl font-bold text-white mb-1">1,200+</div>
                    <div className="text-emerald-200 text-sm font-medium">Active Private Leagues</div>
                </div>
                <div className="p-2">
                    <div className="text-3xl font-bold text-white mb-1">100%</div>
                    <div className="text-emerald-200 text-sm font-medium">Secure League Management</div>
                </div>
            </div>
        </div>
      </section>

      {/* 4. Use Cases */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900">Who is Coupon Busters for?</h2>
                <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Whether you're organizing for the office or the pub, we make coordination easy.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">The Office Syndicate</h3>
                    <p className="text-slate-600">
                        Stop arguing about who picked what. We provide the central record for all picks and pot growth.
                    </p>
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                        <Star className="h-6 w-6 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">The Pub Team</h3>
                    <p className="text-slate-600">
                        Raise money for the end-of-season tour while having a punt every week. Our tracking tool builds your theoretical fund.
                    </p>
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                        <Trophy className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Mates Groups</h3>
                    <p className="text-slate-600">
                        Settle the debate on who actually knows ball. Real league tables, real stats, and a clean interface.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* 6. Why Us */}
      <section className="py-20 bg-white" id="benefits">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm">The Solution</span>
                <h2 className="text-3xl font-bold text-slate-900 mt-2">Professional Grade League Management</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 border border-gray-200 rounded-xl hover:border-emerald-500 transition-colors group">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
                        <Users className="h-6 w-6 text-emerald-600 group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Member Tracking</h3>
                    <p className="text-slate-500">Easily manage approvals and points for all league participants in one central dashboard.</p>
                </div>
                
                <div className="p-6 border border-gray-200 rounded-xl hover:border-emerald-500 transition-colors group">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
                        <Star className="h-6 w-6 text-emerald-600 group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Banker vs Cover</h3>
                    <p className="text-slate-500">Our unique "Two Pick" system adds strategy. One pick for the potential win, one for insurance.</p>
                </div>

                <div className="p-6 border border-gray-200 rounded-xl hover:border-emerald-500 transition-colors group">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
                        <Shield className="h-6 w-6 text-emerald-600 group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">The Safety Pot</h3>
                    <p className="text-slate-600">Even if the bet loses, our tracking system records a "Season Pot" contribution for a end-of-season fund.</p>
                </div>
            </div>
        </div>
      </section>

      {/* 7. How it Works */}
      <section className="py-20 bg-emerald-900 text-white" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-16 text-center">How It Works</h2>
            
            <div className="grid md:grid-cols-4 gap-8">
                <div className="relative text-center">
                    <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold border-2 border-emerald-600">1</div>
                    <h3 className="text-xl font-bold mb-2">Join a League</h3>
                    <p className="text-emerald-200 text-sm">Request access and pick your Representative Team (e.g. Swansea).</p>
                </div>
                <div className="relative text-center">
                    <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold border-2 border-emerald-600">2</div>
                    <h3 className="text-xl font-bold mb-2">Weekly Picks</h3>
                    <p className="text-emerald-200 text-sm">Choose your "Banker" and your "Cover" (for league points).</p>
                </div>
                <div className="relative text-center">
                    <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold border-2 border-emerald-600">3</div>
                    <h3 className="text-xl font-bold mb-2">The Generator</h3>
                    <p className="text-emerald-200 text-sm">Admin gets a generated record of all Banker picks to coordinate the external bet.</p>
                </div>
                <div className="relative text-center">
                    <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold border-2 border-emerald-600">4</div>
                    <h3 className="text-xl font-bold mb-2">Track Results</h3>
                    <p className="text-emerald-200 text-sm">Automated scoring updates the table and increments the Saved Pot.</p>
                </div>
            </div>
        </div>
      </section>

      {/* 9. Pricing / Money Split */}
      <section className="py-20 bg-white" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The Syndicate Concept</h2>
            <p className="text-slate-500 mb-12">How a typical <span className="font-bold text-emerald-600">£20 Weekly Entry</span> is tracked.</p>
            
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-inner">
                <div className="flex h-16 w-full rounded-full overflow-hidden mb-8 shadow-md">
                    <div className="w-[85%] bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        £18.00 Stake
                    </div>
                    <div className="w-[15%] bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                        £2.00
                    </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 text-left">
                    <div className="flex items-start space-x-4">
                         <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Star className="h-6 w-6 text-indigo-600" />
                         </div>
                         <div>
                            <h4 className="font-bold text-indigo-900 text-lg">The Coupon Stake (£18)</h4>
                            <p className="text-sm text-slate-600 mt-1">
                                Designated for the weekly live betting pool. This forms the basis of your coordinated group bet.
                            </p>
                         </div>
                    </div>
                    <div className="flex items-start space-x-4">
                         <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <PiggyBank className="h-6 w-6 text-emerald-600" />
                         </div>
                         <div>
                            <h4 className="font-bold text-emerald-900 text-lg">The Pot Builder (£2)</h4>
                            <p className="text-sm text-slate-600 mt-1">
                                Tracked as a contribution to the League Pot. Guaranteed savings for your end-of-season fund.
                            </p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 11. CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Ready to Coordinate Your League?</h2>
            <p className="text-xl text-slate-500 mb-10">
                Join 1,200+ leagues tracking pots and managing picks professionally.
            </p>
            <Link 
                to="/leagues" 
                className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 duration-200"
            >
                Start Your League Now
                <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
        </div>
      </section>

      {/* 12. FAQ */}
      <section className="py-20 bg-gray-50 border-t border-gray-200" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
                {[
                    { q: "How do we handle the money?", a: "Coupon Busters is a coordination tool. Actual financial contributions and bet placements are managed externally by your league admin. We provide the record-keeping and pick management." },
                    { q: "Is this gambling?", a: "We provide the management platform for private syndicates. We do not set odds or take bets. Your league admin coordinates the group's activities externally." },
                    { q: "What if someone misses a week?", a: "Admins can manually adjust points if a member fails to coordinate with the group for a specific gameday." },
                    { q: "Can I customize the stake amount?", a: "Yes! League admins can set the suggested Weekly Fee and Pot Deduction amount for tracking purposes." }
                ].map((item, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <button 
                            onClick={() => toggleFaq(idx)}
                            className="w-full flex justify-between items-center p-5 text-left font-bold text-slate-900 focus:outline-none"
                        >
                            {item.q}
                            {openFaq === idx ? <ChevronUp className="h-5 w-5 text-emerald-600" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>
                        {openFaq === idx && (
                            <div className="px-5 pb-5 text-slate-600">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center space-x-2 text-white mb-4">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        <span className="font-bold text-xl">Coupon Busters</span>
                    </div>
                    <p className="text-sm max-w-xs">
                        The easiest way to manage football betting syndicates. Coordinated picks, leaderboards, and pot tracking.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#benefits" className="hover:text-white transition-colors">Features</a></li>
                        <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                        <li><a href="#faq" className="hover:text-white transition-colors">Support</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" onClick={handlePreventDefault} className="hover:text-white transition-colors">Terms of Service</a></li>
                        <li><a href="#" onClick={handlePreventDefault} className="hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="#" onClick={handlePreventDefault} className="hover:text-white transition-colors">Responsible Gambling</a></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-center text-xs">
                &copy; 2023 Coupon Busters UK. 18+ Only. Please Gamble Responsibly.
            </div>
        </div>
      </footer>
    </div>
  );
};