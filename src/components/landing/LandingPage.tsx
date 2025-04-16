import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { Truck, BarChart3, Shield, CreditCard, DollarSign, Settings, CheckCircle, Menu, X, Ban as Bank } from 'lucide-react';

export function LandingPage() {
  const user = useAuthStore((state) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      name: 'Fleet Management',
      description: 'Track and manage your entire fleet with real-time monitoring and detailed vehicle records.',
      icon: Truck
    },
    {
      name: 'Financial Analytics',
      description: 'Comprehensive financial reporting with P&L statements, balance sheets, and cost analysis.',
      icon: BarChart3
    },
    {
      name: 'Banking & Cards',
      description: 'Integrated banking solutions with corporate cards and expense management.',
      icon: Bank
    },
    {
      name: 'Expense Tracking',
      description: 'Automated expense tracking and categorization for better financial control.',
      icon: DollarSign
    },
    {
      name: 'Maintenance Scheduling',
      description: 'Proactive maintenance scheduling and service history tracking.',
      icon: Settings
    },
    {
      name: 'Security & Compliance',
      description: 'Enterprise-grade security with role-based access control and compliance features.',
      icon: Shield
    }
  ];

  const testimonials = [
    {
      content: "FleetFinance has transformed how we manage our fleet operations. The integrated banking and expense tracking features are game-changers.",
      author: "Sarah Johnson",
      role: "Fleet Manager",
      company: "Logistics Pro"
    },
    {
      content: "The financial analytics and reporting capabilities have given us unprecedented visibility into our fleet costs and performance.",
      author: "Michael Chen",
      role: "CFO",
      company: "TransCargo Solutions"
    },
    {
      content: "Maintenance scheduling and cost tracking features have helped us reduce downtime and optimize our fleet operations.",
      author: "David Martinez",
      role: "Operations Director",
      company: "Express Fleet Services"
    }
  ];

  return (
    <div className="bg-white">
      {/* Navigation */}
      <header className="fixed w-full bg-white z-50 shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Bank className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  FleetFinance
                </span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="#features" className="text-base font-medium text-gray-500 hover:text-gray-900">
                Features
              </Link>
              <Link to="#testimonials" className="text-base font-medium text-gray-500 hover:text-gray-900">
                Testimonials
              </Link>
              <Link to="#pricing" className="text-base font-medium text-gray-500 hover:text-gray-900">
                Pricing
              </Link>
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/signin"
                    className="text-base font-medium text-gray-500 hover:text-gray-900"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>
            <div className="md:hidden">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-gray-800 bg-opacity-75">
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center">
                <Bank className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  FleetFinance
                </span>
              </Link>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="space-y-6">
                <Link
                  to="#features"
                  className="block text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  to="#testimonials"
                  className="block text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </Link>
                <Link
                  to="#pricing"
                  className="block text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      className="block text-base font-medium text-gray-900"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative isolate">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Modern Fleet Management & Financial Control
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Streamline your fleet operations with integrated banking, expense tracking, and comprehensive analytics.
              Everything you need to manage your fleet's finances in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/signup"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get started
              </Link>
              <Link
                to="#features"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Powerful Fleet Management Features
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Comprehensive tools to manage your fleet's operations, finances, and maintenance all in one platform.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon className="h-5 w-5 flex-none text-blue-600" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Testimonials</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by Fleet Managers
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="flex flex-col bg-white p-6 shadow-sm ring-1 ring-gray-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-base leading-7 text-gray-600">{testimonial.content}</p>
                </div>
                <div className="mt-6">
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm leading-6 text-gray-600">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="relative isolate overflow-hidden bg-blue-600 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your fleet management?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Join thousands of fleet managers who trust FleetFinance for their operations.
              Start your journey today.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/signup"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get started
              </Link>
              <Link
                to="/signin"
                className="text-sm font-semibold leading-6 text-white"
              >
                Sign in <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8">
              <div className="flex items-center">
                <Bank className="h-8 w-8 text-white" />
                <span className="ml-2 text-xl font-bold text-white">
                  FleetFinance
                </span>
              </div>
              <p className="text-sm leading-6 text-gray-300">
                Modern fleet management and financial control platform.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">Product</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link to="#features" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link to="#pricing" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Pricing
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-white">Support</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link to="#" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Documentation
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Contact
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">Company</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link to="#" className="text-sm leading-6 text-gray-300 hover:text-white">
                        About
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Blog
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-white">Legal</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link to="#" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Privacy
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="text-sm leading-6 text-gray-300 hover:text-white">
                        Terms
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
            <p className="text-xs leading-5 text-gray-400">
              &copy; {new Date().getFullYear()} FleetFinance. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}