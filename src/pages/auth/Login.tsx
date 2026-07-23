import React, { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Checkbox } from '@/components/ui/forms/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Anchor, Fingerprint, Mail, Lock, User, UserCircle, ShieldCheck, Ship, Box, Layers, BarChart, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const signinSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean()
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Needs an uppercase letter').regex(/[a-z]/, 'Needs a lowercase letter').regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  resetCode: z.string().length(6, 'Code must be exactly 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export default function Login() {
  const { user, login, biometricLogin, register: authRegister, forgotPassword, resetPassword } = useAuth();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  const signinForm = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: '', password: '', rememberMe: true }
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', role: 'Ejecutivo', email: '', password: '', confirmPassword: '' }
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' }
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '', resetCode: '', password: '', confirmPassword: '' }
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSignin = async (data: z.infer<typeof signinSchema>) => {
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Successfully signed in.");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (data: z.infer<typeof signupSchema>) => {
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      await authRegister(data.email, data.password, data.firstName, data.lastName, data.role); 
      toast.success("Account created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Email may be in use.");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (data: z.infer<typeof forgotSchema>) => {
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      await forgotPassword(data.email);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setDemoCodeHint(code);
      setSuccessMsg("Recovery code generated. Please check your email.");
      setMode('reset');
      resetForm.setValue('email', data.email);
      resetForm.setValue('resetCode', code);
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      await resetPassword(data.email, data.resetCode, data.password);
      toast.success("Password reset successfully! Please sign in.");
      setMode('signin');
      signinForm.setValue('email', data.email);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row font-sans">
      <div className="hidden md:flex md:w-1/2 bg-blue-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c80a71?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-900/80 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20">
              <Anchor className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nexus SCM</h1>
              <p className="text-blue-300 text-sm font-medium tracking-wide">Enterprise Operations</p>
            </div>
          </div>

          <div className="space-y-8 max-w-md">
            <h2 className="text-4xl font-bold leading-tight">
              Control your global supply chain in real-time.
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-blue-800/50 p-2 rounded-lg mt-1"><Ship className="w-5 h-5 text-blue-300" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Freight Forwarding</h3>
                  <p className="text-blue-200 text-sm">End-to-end visibility for ocean and air shipments.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-800/50 p-2 rounded-lg mt-1"><Box className="w-5 h-5 text-blue-300" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Warehouse Automation</h3>
                  <p className="text-blue-200 text-sm">Real-time inventory and yard management.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-800/50 p-2 rounded-lg mt-1"><BarChart className="w-5 h-5 text-blue-300" /></div>
                <div>
                  <h3 className="font-semibold text-lg">Financial Analytics</h3>
                  <p className="text-blue-200 text-sm">Automated billing, cost analysis, and invoicing.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-blue-300 text-sm">
          <p>&copy; {new Date().getFullYear()} Nexus SCM Inc.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Help</a>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 xl:px-32 relative bg-white dark:bg-zinc-950">
        <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
          <Anchor className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold">Nexus SCM</span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {mode === 'signin' ? 'Welcome back' : 
               mode === 'signup' ? 'Create an account' : 
               mode === 'forgot' ? 'Reset password' : 'Set new password'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
              {mode === 'signin' ? 'Sign in to access your operations dashboard.' : 
               mode === 'signup' ? 'Join Nexus to manage your logistics.' : 
               mode === 'forgot' ? 'Enter your email to receive a recovery code.' : 'Securely update your account credentials.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={signinForm.handleSubmit(onSignin)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input id="signin-email" type="email" placeholder="name@company.com" className="pl-9.5" {...signinForm.register('email')} />
                </div>
                {signinForm.formState.errors.email && <p className="text-xs text-red-500">{signinForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="signin-password">Password</Label>
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input id="signin-password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-9.5 pr-10" {...signinForm.register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-zinc-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signinForm.formState.errors.password && <p className="text-xs text-red-500">{signinForm.formState.errors.password.message}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" onCheckedChange={(c) => signinForm.setValue('rememberMe', c as boolean)} checked={signinForm.watch('rememberMe')} />
                <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-600 dark:text-zinc-400">Remember me</label>
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="mt-6 text-center text-sm text-zinc-500">
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="font-semibold text-blue-600 hover:text-blue-500">Create one</button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input placeholder="John" className="pl-9.5" {...signupForm.register('firstName')} />
                  </div>
                  {signupForm.formState.errors.firstName && <p className="text-xs text-red-500">{signupForm.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input placeholder="Doe" {...signupForm.register('lastName')} />
                  {signupForm.formState.errors.lastName && <p className="text-xs text-red-500">{signupForm.formState.errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 z-10" />
                  <Select onValueChange={(val) => signupForm.setValue('role', val)} value={signupForm.watch('role')}>
                    <SelectTrigger className="pl-9.5">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales (Ejecutivo de Cuenta)</SelectItem>
                      <SelectItem value="Operations">Operations (Operador Logístico)</SelectItem>
                      <SelectItem value="Admin">Admin (Administrador)</SelectItem>
                      <SelectItem value="Cliente">Client (Cliente Externo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type="email" placeholder="name@company.com" className="pl-9.5" {...signupForm.register('email')} />
                </div>
                {signupForm.formState.errors.email && <p className="text-xs text-red-500">{signupForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Create password" className="pl-9.5 pr-10" {...signupForm.register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-zinc-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && <p className="text-xs text-red-500">{signupForm.formState.errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm password" className="pl-9.5 pr-10" {...signupForm.register('confirmPassword')} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-zinc-400">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{signupForm.formState.errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Registering..." : "Create Account & Sign In"}
              </Button>

              <div className="mt-6 text-center text-sm text-zinc-500">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('signin')} className="font-semibold text-blue-600 hover:text-blue-500">Sign in</button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type="email" placeholder="Enter registered email" className="pl-9.5" {...forgotForm.register('email')} />
                </div>
                {forgotForm.formState.errors.email && <p className="text-xs text-red-500">{forgotForm.formState.errors.email.message}</p>}
                <p className="text-xs text-zinc-400">A secure reset code will be generated instantly for simulation.</p>
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Generating Code..." : "Generate Recovery Code"}
              </Button>

              <div className="flex justify-between items-center text-xs mt-4">
                <button type="button" onClick={() => setMode('reset')} className="text-zinc-500 hover:text-blue-600">Already have a reset code?</button>
                <button type="button" onClick={() => setMode('signin')} className="text-blue-600 font-semibold hover:underline">Back to Sign In</button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
              {demoCodeHint && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 rounded-xl text-blue-700 text-xs">
                  <p className="font-semibold flex items-center gap-1 mb-1"><ShieldCheck className="w-4 h-4 text-blue-500" /> PWA Recovery Simulation Mode</p>
                  <p>We've captured your secure code: <strong className="text-sm tracking-widest text-blue-800 font-bold">{demoCodeHint}</strong></p>
                  <p className="mt-1 text-[10px] opacity-80">Use this code below to set a new password securely.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type="email" placeholder="name@company.com" className="pl-9.5" {...resetForm.register('email')} />
                </div>
                {resetForm.formState.errors.email && <p className="text-xs text-red-500">{resetForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>6-Digit Recovery Code</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input placeholder="123456" maxLength={6} className="pl-9.5 tracking-widest font-bold" {...resetForm.register('resetCode')} />
                </div>
                {resetForm.formState.errors.resetCode && <p className="text-xs text-red-500">{resetForm.formState.errors.resetCode.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Enter new password" className="pl-9.5 pr-10" {...resetForm.register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-zinc-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.password && <p className="text-xs text-red-500">{resetForm.formState.errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" className="pl-9.5 pr-10" {...resetForm.register('confirmPassword')} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-zinc-400">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Resetting Password..." : "Change Password & Sign In"}
              </Button>

              <button type="button" onClick={() => setMode('signin')} className="w-full mt-4 text-center text-sm font-semibold text-blue-600 hover:underline block">
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
