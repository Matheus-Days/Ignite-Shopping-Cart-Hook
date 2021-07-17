import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productStock = (await api.get(`/stock/${productId}`)).data;

      const cartProduct = cart.find((product) => product.id === productId) || {
        amount: 0,
      };

      if (productStock.amount <= cartProduct.amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        const newProduct = (await api.get(`/products/${productId}`)).data;

        const cartProductIndex = cart.findIndex(
          (product) => product.id === newProduct.id
        );

        if (cartProductIndex < 0) {
          newProduct.amount = 1;
          setCart([...cart, newProduct]);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, newProduct])
          );
        } else {
          const newCart = cart.map((product) => {
            if (product.id !== newProduct.id) return product;

            product.amount += 1;

            return product;
          });
          setCart(newCart);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.findIndex((product) => product.id === productId) < 0)
        throw Error;
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount < 1) return;
    try {
      const productStock = (await api.get(`/stock/${productId}`)).data;

      if (productStock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        const newCart = cart.map((product) => {
          if (productId !== product.id) return product;

          product.amount = amount;

          return product;
        });

        setCart(newCart);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
