FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["DataIngestion/DataIngestion.csproj", "DataIngestion/"]
RUN dotnet restore "DataIngestion/DataIngestion.csproj"
COPY . .
WORKDIR "/src/DataIngestion"
RUN dotnet build "DataIngestion.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "DataIngestion.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Microsoft.CopilotDashboard.DataIngestion.dll"]