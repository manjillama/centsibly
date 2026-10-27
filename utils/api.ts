async function get<T>(url: string): Promise<
  | {
      status: "success";
      data: T;
    }
  | { status: "fail" | "error"; message: string; errors: string[] }
> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Uh oh! Something went wrong",
      errors: ["Uh oh! Something went wrong"],
    };
  }
}
async function post<T>(
  url: string,
  data: any
): Promise<
  | {
      status: "success";
      data: T;
    }
  | { status: "fail" | "error"; message: string; errors: string[] }
> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application.json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      cache: "default",
    });
    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Uh oh! Something went wrong",
      errors: ["Uh oh! Something went wrong"],
    };
  }
}

async function put<T>(
  url: string,
  data: any,
  method: "PUT" | "PATCH" = "PUT"
): Promise<
  | {
      status: "success";
      data: T;
    }
  | { status: "fail" | "error"; message: string; errors: string[] }
> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application.json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      cache: "default",
    });
    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Uh oh! Something went wrong",
      errors: ["Uh oh! Something went wrong"],
    };
  }
}

async function remove(url: string) {
  try {
    const response = await fetch(url, { method: "DELETE" });
    return await response.json();
  } catch {
    return { status: "error", message: "Unable to delete transaction. Please try again." };
  }
}

const api = {
  remove,
  get,
  post,
  put,
};

export default api;
