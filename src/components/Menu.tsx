import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function Menu() {
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Tabs defaultValue="home" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Home</CardTitle>
              <CardDescription>
                Your gateway to everything we offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Welcome to our homepage! Here you'll find the latest updates, featured content, 
                and quick access to our most popular sections.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-accent rounded-lg">
                  <h3 className="mb-2">Latest News</h3>
                  <p className="text-muted-foreground">
                    Stay updated with our newest announcements and features.
                  </p>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <h3 className="mb-2">Quick Start</h3>
                  <p className="text-muted-foreground">
                    Get started quickly with our step-by-step guide.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>About Us</CardTitle>
              <CardDescription>
                Learn more about our story and mission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We are a dedicated team passionate about delivering exceptional experiences. 
                Our journey started with a simple idea: to make things better for everyone.
              </p>
              <div className="space-y-3">
                <div>
                  <h4>Our Mission</h4>
                  <p className="text-muted-foreground">
                    To provide innovative solutions that empower people and businesses to achieve their goals.
                  </p>
                </div>
                <div>
                  <h4>Our Values</h4>
                  <p className="text-muted-foreground">
                    Excellence, innovation, integrity, and customer satisfaction drive everything we do.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Services</CardTitle>
              <CardDescription>
                Comprehensive solutions for your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="mb-2">Consulting</h4>
                  <p className="text-muted-foreground">
                    Expert advice tailored to your specific requirements.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="mb-2">Development</h4>
                  <p className="text-muted-foreground">
                    Custom solutions built with modern technologies.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="mb-2">Support</h4>
                  <p className="text-muted-foreground">
                    24/7 support to keep your systems running smoothly.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="mb-2">Training</h4>
                  <p className="text-muted-foreground">
                    Comprehensive training programs for your team.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="mb-2">Analytics</h4>
                  <p className="text-muted-foreground">
                    Data-driven insights to improve your operations.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="mb-2">Integration</h4>
                  <p className="text-muted-foreground">
                    Seamless integration with your existing systems.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Products</CardTitle>
              <CardDescription>
                Innovative products designed for success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="mb-2">Product Suite Pro</h4>
                  <p className="text-muted-foreground mb-2">
                    Our flagship product offering comprehensive functionality for enterprise users.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm">Enterprise</span>
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm">Popular</span>
                  </div>
                </div>
                <div className="border-l-4 border-secondary pl-4">
                  <h4 className="mb-2">Starter Kit</h4>
                  <p className="text-muted-foreground mb-2">
                    Perfect for small businesses and individuals getting started.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-accent text-accent-foreground rounded text-sm">Beginner Friendly</span>
                  </div>
                </div>
                <div className="border-l-4 border-accent pl-4">
                  <h4 className="mb-2">Custom Solutions</h4>
                  <p className="text-muted-foreground mb-2">
                    Tailored products built specifically for your unique requirements.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-sm">Custom</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>
                Get in touch with our team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2">General Information</h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p>📧 info@company.com</p>
                      <p>📞 +1 (555) 123-4567</p>
                      <p>🏢 123 Business Ave, Suite 100</p>
                      <p>🌍 New York, NY 10001</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2">Business Hours</h4>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 4:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2">Departments</h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p>Sales: sales@company.com</p>
                      <p>Support: support@company.com</p>
                      <p>Partnerships: partners@company.com</p>
                      <p>Media: media@company.com</p>
                    </div>
                  </div>
                  <div className="p-4 bg-accent rounded-lg">
                    <h4 className="mb-2">Emergency Support</h4>
                    <p className="text-muted-foreground">
                      For urgent matters outside business hours, call our emergency line at +1 (555) 999-0000
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}