def mod_inverse(n, p):
    return pow(n, p - 2, p)

class ToyCurve:
    def __init__(self, a, b, p):
        self.a = a
        self.b = b
        self.p = p

    def is_on_curve(self, pt):
        if pt is None:
            return True
        x, y = pt
        return (y**2 - (x**3 + self.a * x + self.b)) % self.p == 0

    def add(self, p1, p2):
        if p1 is None:
            return p2
        if p2 is None:
            return p1
        
        x1, y1 = p1
        x2, y2 = p2
        
        if x1 == x2 and (y1 + y2) % self.p == 0:
            return None
            
        if p1 != p2:
            num = (y2 - y1) % self.p
            den = (x2 - x1) % self.p
            lam = (num * mod_inverse(den, self.p)) % self.p
        else:
            if y1 == 0:
                return None
            num = (3 * x1**2 + self.a) % self.p
            den = (2 * y1) % self.p
            lam = (num * mod_inverse(den, self.p)) % self.p
            
        x3 = (lam**2 - x1 - x2) % self.p
        y3 = (lam * (x1 - x3) - y1) % self.p
        return (x3, y3)

    def multiply(self, pt, k):
        if k == 0 or pt is None:
            return None
        res = None
        addend = pt
        while k > 0:
            if k & 1:
                res = self.add(res, addend)
            addend = self.add(addend, addend)
            k >>= 1
        return res

# Search for small curves
for p in [5, 7, 11]:
    for a in range(p):
        for b in range(p):
            # Check non-singular
            if (4 * a**3 + 27 * b**2) % p == 0:
                continue
            curve = ToyCurve(a, b, p)
            pts = []
            for x in range(p):
                for y in range(p):
                    if curve.is_on_curve((x, y)):
                        pts.append((x, y))
            group_order = len(pts) + 1 # including point at infinity
            if group_order in [5, 7]:
                print(f"p={p}, a={a}, b={b} -> Group Order {group_order}")
                print(f"  Points: {pts}")
